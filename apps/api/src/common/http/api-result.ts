export class ApiResult<T = unknown> {
  constructor(
    public readonly data: T,
    public readonly message: string = 'OK',
    public readonly redirectUrl?: string,
  ) {}
}
