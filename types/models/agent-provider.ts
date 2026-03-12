export interface ExuluProvider {
    id: string
    name: string
    provider: string
    providerName: string
    description: string
    enable_batch: boolean
    inputSchema: any;
    slug: string
    type: string
}