import React from 'react';
import { EndpointCard } from './EndpointCard';

interface QueryParam {
  name: string;
  description: string;
  example: string;
}

interface EndpointData {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  requestBody?: any;
  queryParams?: QueryParam[];
  responseExample: any;
}

interface EndpointSectionProps {
  title: string;
  description?: string;
  endpoints: EndpointData[];
}

export const EndpointSection: React.FC<EndpointSectionProps> = ({ 
  title, 
  description, 
  endpoints 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="grid gap-6">
        {endpoints.map((endpoint, index) => (
          <EndpointCard key={index} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
};
