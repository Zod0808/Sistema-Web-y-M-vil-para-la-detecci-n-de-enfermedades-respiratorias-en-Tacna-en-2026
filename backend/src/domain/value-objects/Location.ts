// Value Object para Ubicación - Capa de Dominio
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export class LocationValueObject {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly address: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error('La latitud debe estar entre -90 y 90');
    }

    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error('La longitud debe estar entre -180 y 180');
    }

    if (!this.address || this.address.trim().length === 0) {
      throw new Error('La dirección es obligatoria');
    }

    if (this.address.length > 200) {
      throw new Error('La dirección no puede exceder 200 caracteres');
    }
  }

  public isValid(): boolean {
    return this.latitude >= -90 && this.latitude <= 90 &&
           this.longitude >= -180 && this.longitude <= 180 &&
           this.address.trim().length > 0 && this.address.length <= 200;
  }

  public distanceTo(other: LocationValueObject): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(this.latitude)) * Math.cos(this.toRadians(other.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  public isNearby(other: LocationValueObject, radiusKm: number = 10): boolean {
    return this.distanceTo(other) <= radiusKm;
  }

  public equals(other: LocationValueObject): boolean {
    return Math.abs(this.latitude - other.latitude) < 0.0001 &&
           Math.abs(this.longitude - other.longitude) < 0.0001;
  }

  public toString(): string {
    return `${this.address} (${this.latitude}, ${this.longitude})`;
  }

  public toCoordinates(): { lat: number; lng: number } {
    return {
      lat: this.latitude,
      lng: this.longitude
    };
  }
}
