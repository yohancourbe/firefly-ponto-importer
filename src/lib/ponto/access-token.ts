export class AccessToken {
  public token: string;
  private expiresIn: number;
  private createdAt: number;

  constructor(accessToken: string, expiresIn: number) {
    this.token = accessToken;
    this.expiresIn = expiresIn;
    this.createdAt = Date.now();
  }

  /**
   * @param maxDrift maximum gap in milliseconds to consider the token expired
   * @returns true if the token is still valid and false otherwise
   */
  public isValid(): boolean {
    return this.createdAt + this.expiresIn * 1000 > Date.now();
  }

  public get expiresAt(): Date {
    return new Date(this.createdAt + this.expiresIn * 1000);
  }
}
