export interface ExuluTool {
    id: string;
    name: string;
    description: string;
    type: string;
    category: string;
    inputSchema: any;
    outputSchema: any;
    config: {
        name: string;
        description: string;
        type: "boolean" | "string" | "number" | "variable";
        default?: string | boolean | number | "variable";
        value?: string; // the exulu variable reference
    }[];
}
