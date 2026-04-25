// DTO para Respuesta de API - Capa de Interfaz
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ApiResponseBuilder<T = any> {
  private response: ApiResponse<T> = {
    success: false,
    message: ''
  };

  static success<T>(message: string, data?: T): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error
    };
  }

  static successWithPagination<T>(
    message: string, 
    data: T[], 
    page: number, 
    limit: number, 
    total: number
  ): ApiResponse<T[]> {
    return {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  withSuccess(success: boolean): this {
    this.response.success = success;
    return this;
  }

  withMessage(message: string): this {
    this.response.message = message;
    return this;
  }

  withData(data: T): this {
    this.response.data = data;
    return this;
  }

  withError(error: string): this {
    this.response.error = error;
    return this;
  }

  withPagination(page: number, limit: number, total: number): this {
    this.response.pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
    return this;
  }

  build(): ApiResponse<T> {
    return this.response;
  }
}
