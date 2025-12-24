import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Response } from '@/components/ai-elements/response';

import {
    Artifact,
    ArtifactAction,
    ArtifactActions,
    ArtifactContent,
    ArtifactHeader,
} from '@/components/ai-elements/artifact';
import { CopyIcon, InfoIcon } from "lucide-react";

export function TextPreview({
    text,
    sliceLength
}: {
    text?: string;
    sliceLength?: number;
}) {
    const { toast } = useToast();
    const displayLength = sliceLength ?? 200;
    if (!text) {
        text = ""
    }
    const isTruncated = text.length > displayLength;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="cursor-pointer text-sm text-left w-full hover:bg-accent/70 active:bg-accent transition-all rounded-lg p-3 group border border-transparent hover:border-border hover:shadow-sm">
                    <span className="block leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
                        {text?.slice(0, displayLength)}
                        {isTruncated && <span className="text-muted-foreground">...</span>}
                    </span>
                    {isTruncated && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 group-hover:text-foreground/70 transition-colors font-medium">
                            <InfoIcon className="w-3.5 h-3.5" />
                            Click to view full text ({text.length.toLocaleString()} characters)
                        </span>
                    )}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mt-5">
                    <div className="text-sm font-medium text-muted-foreground">
                        {text.length.toLocaleString()} characters
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer" onClick={async () => {
                        await navigator.clipboard.writeText(text);
                        toast({ title: "Copied to clipboard" });
                    }}>
                        <span className="text-muted-foreground">Copy value to clipboard</span>
                        <CopyIcon className="size-4" />
                    </span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-4 bg-muted max-h-[100%] overflow-y-auto">
                    <Response>{text}</Response>
                </div>
            </DialogContent>
        </Dialog>
    );
}
