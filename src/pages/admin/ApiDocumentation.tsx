import React, { useState, useMemo } from 'react';
import { ApiDocsSidebar } from '@/components/admin/ApiDocsSidebar';
import { ApiDocsContent } from '@/components/admin/ApiDocsContent';
import { ApiDocsPagination } from '@/components/admin/ApiDocsPagination';
import { apiEndpointsData, webhookEventsData, webhookEndpointsData, logsEndpointsData } from '@/data/apiEndpointsData';

const ITEMS_PER_PAGE = 5;

const ApiDocumentation: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('intro');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['catalog']));

  // Get endpoints for the selected section
  const currentEndpoints = useMemo(() => {
    // Special sections: webhooks shows events + endpoints, logs shows log schemas
    if (selectedSection === 'webhooks') {
      return [...webhookEventsData, ...webhookEndpointsData];
    }
    if (selectedSection === 'logs') {
      return logsEndpointsData;
    }

    const category = apiEndpointsData.find(cat => cat.id === selectedSection);
    if (category?.endpoints) {
      return category.endpoints;
    }
    if (category?.subcategories) {
      return category.subcategories.flatMap(sub => sub.endpoints);
    }
    return [];
  }, [selectedSection]);

  // Paginated endpoints
  const paginatedEndpoints = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return currentEndpoints.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentEndpoints, currentPage]);

  const totalPages = Math.ceil(currentEndpoints.length / ITEMS_PER_PAGE);

  // Handle category toggle
  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setCurrentPage(1); // Reset pagination on section change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span className="text-primary">&lt;/&gt;</span> API Documentação
        </h1>
        <p className="text-muted-foreground mt-2">
          Documentação completa da API REST para integração com sistemas externos
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 min-h-[calc(100vh-200px)]">
        {/* Left sidebar navigation */}
        <div className="w-72 shrink-0">
          <ApiDocsSidebar
            selectedSection={selectedSection}
            onSectionChange={handleSectionChange}
            expandedCategories={expandedCategories}
            onCategoryToggle={handleCategoryToggle}
          />
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          <ApiDocsContent
            selectedSection={selectedSection}
            endpoints={paginatedEndpoints}
          />

          {/* Pagination */}
          {currentEndpoints.length > ITEMS_PER_PAGE && (
            <div className="mt-6">
              <ApiDocsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={currentEndpoints.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiDocumentation;
