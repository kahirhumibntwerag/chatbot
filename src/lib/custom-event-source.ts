
export class CustomEventSource extends EventSource {
  constructor(url: string, configuration: { headers?: Record<string, string> }) {
    const { headers } = configuration;
    const queryString = headers
      ? '&' + Object.entries(headers)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    super(url + queryString);
  }
}