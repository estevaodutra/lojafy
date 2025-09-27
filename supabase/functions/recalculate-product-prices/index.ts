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

      // Apply gateway fee
      newPrice += (product.cost_price * gateway_fee_percentage / 100)

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100

      return {
        id: product.id,
        price: newPrice,
        updated_at: new Date().toISOString()
      }
    }).filter(update => update !== null)

    console.log(`Prepared ${updates.length} price updates`)

    // Background task to update products in batches
    const updateProductsInBackground = async () => {
      try {
        const batchSize = 50
        let updatedCount = 0

        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize)
          
          console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`)

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

        console.log(`Price recalculation completed. Updated ${updatedCount} products.`)

        // Optionally, send a notification to admins about completion
        // You could insert a notification record here if needed

      } catch (error) {
        console.error('Error in background price update:', error)
      }
    }

    // Use EdgeRuntime.waitUntil to handle background processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(updateProductsInBackground())
    } else {
      // Fallback for local development
      updateProductsInBackground()
    }

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
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})