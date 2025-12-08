export interface KnowledgeSourceSearchResultChunk {
    chunk_content: string,
    chunk_index: number,
    chunk_id: string,
    chunk_source: string,
    chunk_metadata: Record<string, string>,
    chunk_created_at: string,
    chunk_updated_at: string,
    item_id: string,
    item_external_id: string,
    item_name: string,
    item_updated_at: string,
    item_created_at: string,
    context: {
        name: string,
        id: string
    }
}