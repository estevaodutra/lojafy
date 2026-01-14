import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecalculateRequest {
  platform_fee_value: number
  platform_fee_type: 'percentage' | 'fixed'
  gateway_fee_percentage: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { platform_fee_value, platform_fee_type, gateway_fee_percentage }: RecalculateRequest = await req.json()

    console.log('Starting product price recalculation with settings:', {
      platform_fee_value,
      platform_fee_type,
      gateway_fee_percentage
    })

    // Fetch platform settings including additional_costs
    const { data: platformSettings, error: settingsError } = await supabaseClient
      .from('platform_settings')
      .select('additional_costs')
      .single()

    if (settingsError) {
      console.error('Error fetching platform settings:', settingsError)
      throw settingsError
    }

    const additionalCosts = platformSettings?.additional_costs || []
    console.log('Additional costs to apply:', additionalCosts)

    // Fetch all active products with cost_price
    const { data: products, error: fetchError } = await supabaseClient
      .from('products')
      .select('id, cost_price, price, name')
      .eq('active', true)
      .not('cost_price', 'is', null)

    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      throw fetchError
    }

    if (!products || products.length === 0) {
      console.log('No products found with cost_price to recalculate')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products found to recalculate',
          updated_products: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${products.length} products to recalculate`)

    // Calculate new prices for all products
    const updates = products.map(product => {
      if (!product.cost_price) return null

      let newPrice = product.cost_price

      // Apply platform fee
      if (platform_fee_type === 'percentage') {
        newPrice += (product.cost_price * platform_fee_value / 100)
      } else {
        newPrice += platform_fee_value
      }

      // Apply additional costs
      if (Array.isArray(additionalCosts)) {
        additionalCosts.forEach((cost: any) => {
          if (cost.active) {
            if (cost.type === 'percentage') {
              newPrice += (product.cost_price * cost.value / 100)
            } else {
              newPrice += cost.value
            }
          }
        })
      }

      // Apply gateway fee on final price
      const priceBeforeFee = newPrice
      newPrice = priceBeforeFee / (1 - gateway_fee_percentage / 100)

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100

      return {
        id: product.id,
        price: newPrice,
        updated_at: new Date().toISOString()
      }
    }).filter(update => update !== null)

    console.log(`Prepared ${updates.length} price updates`)

    // Fetch all variants with cost_price for recalculation
    const { data: variants, error: variantsError } = await supabaseClient
      .from('product_variants')
      .select('id, cost_price, price_modifier')
      .not('cost_price', 'is', null)

    if (variantsError) {
      console.error('Error fetching variants:', variantsError)
    }

    const variantUpdates = (variants || []).map(variant => {
      if (!variant.cost_price) return null

      let newPrice = variant.cost_price

      // Apply platform fee
      if (platform_fee_type === 'percentage') {
        newPrice += (variant.cost_price * platform_fee_value / 100)
      } else {
        newPrice += platform_fee_value
      }

      // Apply additional costs
      if (Array.isArray(additionalCosts)) {
        additionalCosts.forEach((cost: any) => {
          if (cost.active) {
            if (cost.type === 'percentage') {
              newPrice += (variant.cost_price * cost.value / 100)
            } else {
              newPrice += cost.value
            }
          }
        })
      }

      // Apply gateway fee on final price
      const priceBeforeFee = newPrice
      newPrice = priceBeforeFee / (1 - gateway_fee_percentage / 100)

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100

      return {
        id: variant.id,
        price_modifier: newPrice
      }
    }).filter(update => update !== null)

    console.log(`Prepared ${variantUpdates.length} variant price updates`)

    // Background task to update products and variants in batches
    const updateProductsInBackground = async () => {
      try {
        const batchSize = 50
        let updatedCount = 0

        // Update products
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize)
          
          console.log(`Processing product batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`)

          for (const update of batch) {
            const { error: updateError } = await supabaseClient
              .from('products')
              .update({ 
                price: update.price,
                updated_at: update.updated_at
              })
              .eq('id', update.id)

            if (updateError) {
              console.error(`Error updating product ${update.id}:`, updateError)
            } else {
              updatedCount++
              console.log(`Updated product ${update.id}: price = ${update.price}`)
            }
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Update variants
        let variantsUpdatedCount = 0
        for (let i = 0; i < variantUpdates.length; i += batchSize) {
          const batch = variantUpdates.slice(i, i + batchSize)
          
          console.log(`Processing variant batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(variantUpdates.length / batchSize)}`)

          for (const update of batch) {
            if (!update) continue
            
            const { error: updateError } = await supabaseClient
              .from('product_variants')
              .update({ 
                price_modifier: update.price_modifier
              })
              .eq('id', update.id)

            if (updateError) {
              console.error(`Error updating variant ${update.id}:`, updateError)
            } else {
              variantsUpdatedCount++
              console.log(`Updated variant ${update.id}: price_modifier = ${update.price_modifier}`)
            }
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`Price recalculation completed. Updated ${updatedCount} products and ${variantsUpdatedCount} variants.`)

        // Optionally, send a notification to admins about completion
        // You could insert a notification record here if needed

      } catch (error) {
        console.error('Error in background price update:', error)
      }
    }

    // Start background process without EdgeRuntime dependency
    updateProductsInBackground()

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Price recalculation started successfully',
        products_to_update: updates.length,
        estimated_completion: '1-2 minutes'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in recalculate-product-prices function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})