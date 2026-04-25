// Type declarations for packages without @types

declare module 'hpp' {
  import { RequestHandler } from 'express';
  function hpp(): RequestHandler;
  export = hpp;
}

declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  function xss(): RequestHandler;
  export = xss;
}

declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';
  import { SwaggerDefinition } from 'swagger-jsdoc';
  
  interface SwaggerUiOptions {
    customCss?: string;
    customSiteTitle?: string;
    swaggerOptions?: any;
  }
  
  function serve(content: any): RequestHandler[];
  function setup(swaggerDoc: SwaggerDefinition, options?: SwaggerUiOptions): RequestHandler;
  
  export { serve, setup };
}

// OpenTelemetry modules (optional dependencies)
declare module '@opentelemetry/sdk-node' {
  export class NodeSDK {
    constructor(options?: any);
    start(): Promise<void>;
    shutdown(): Promise<void>;
  }
}

declare module '@opentelemetry/auto-instrumentations-node' {
  export function getNodeAutoInstrumentations(options?: any): any[];
}

declare module '@opentelemetry/resources' {
  export class Resource {
    constructor(attributes?: any);
  }
}

declare module '@opentelemetry/semantic-conventions' {
  export const SemanticResourceAttributes: any;
}

declare module '@opentelemetry/exporter-jaeger' {
  export class JaegerExporter {
    constructor(options?: any);
  }
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  export class OTLPTraceExporter {
    constructor(options?: any);
  }
}