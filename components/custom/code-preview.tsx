import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";
import prettier from "prettier/standalone";
import * as React from "react";
import { useEffect, useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import {
    a11yDark,
    dracula,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { CopyIcon, DownloadIcon, InfoIcon } from "lucide-react";

SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("javascript", javascript);

const LARGE_CODE_THRESHOLD = 50000; // Characters threshold for automatic download

export function CodePreview({
                                className = null,
                                code: inputCode,
                                language,
                                slice = 200,
                            }: {
    className?: string | null;
    code: string;
    language?: string;
    slice?: number | null;
}) {
    const { toast } = useToast();
    const [code, setCode] = useState<string | null>(null);

    const format = async (code: any, language: string) => {
        if (typeof code !== "string") {
            code = JSON.stringify(code, null, 2);
        }
        const formattedCode = await prettier.format(code, {
            parser: language,
            plugins: [babel, estree],
        });
        setCode(formattedCode);
    };

    useEffect(() => {
        if (language === "json") {
            format(inputCode, "json");
        } else if (language === "javascript" || language === "js") {
            format(inputCode, "babel");
        } else {
            setCode(inputCode);
        }
    }, [inputCode, language]);

    const displaySlice = slice || 200;
    const isTruncated = (code?.length ?? 0) > displaySlice;
    const lineCount = code?.split('\n').length || 0;
    const isVeryLarge = (code?.length ?? 0) > LARGE_CODE_THRESHOLD;

    const downloadAsFile = () => {
        const blob = new Blob([code ?? ""], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = language === 'javascript' || language === 'js' ? 'js' : language === 'json' ? 'json' : 'txt';
        a.download = `code-${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Downloaded as file" });
    };

    if (isVeryLarge && code?.length) {
        return (
            <div className="relative group">
                <button
                    onClick={downloadAsFile}
                    className="w-full rounded-lg border border-border hover:border-border/80 hover:shadow-md transition-all overflow-hidden"
                >
                    <SyntaxHighlighter
                        className={cn("cursor-pointer !bg-[#282a36] !m-0", className)}
                        showLineNumbers={true}
                        wrapLines={true}
                        lineProps={{
                            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
                        }}
                        language={language ? language : "plaintext"}
                        style={dracula}
                    >
                        {`${code?.slice(0, displaySlice)}\n...`}
                    </SyntaxHighlighter>
                </button>
                <div className="mt-2 text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors font-medium flex items-center gap-1.5">
                    <DownloadIcon className="w-3.5 h-3.5" />
                    Click to download as .{language === 'javascript' || language === 'js' ? 'js' : language === 'json' ? 'json' : 'txt'} file ({lineCount.toLocaleString()} lines, {code?.length.toLocaleString()} characters)
                </div>
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {code?.length && (
                    <div className="relative group">
                        <div className="rounded-lg border border-border hover:border-border/80 hover:shadow-md transition-all overflow-hidden">
                            <SyntaxHighlighter
                                className={cn("cursor-pointer !bg-[#282a36] !m-0", className)}
                                showLineNumbers={true}
                                wrapLines={true}
                                lineProps={{
                                    style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
                                }}
                                language={language ? language : "plaintext"}
                                style={dracula}
                            >
                                {`${code?.slice(0, displaySlice)}${isTruncated ? '\n...' : ''}`}
                            </SyntaxHighlighter>
                        </div>
                        {isTruncated && (
                            <div className="mt-2 text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors font-medium flex items-center gap-1.5">
                                <InfoIcon className="w-3.5 h-3.5" />
                                Click to view full code ({lineCount} lines)
                            </div>
                        )}
                    </div>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1000px] max-h-[700px] flex flex-col">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <span>Code Preview</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {language && `(${language})`} • {lineCount} lines
                            </span>
                        </DialogTitle>
                        <button
                            className="text-sm px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors font-medium"
                            onClick={async () => {
                                await navigator.clipboard.writeText(code ?? "");
                                toast({ title: "Copied to clipboard" });
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <CopyIcon className="w-4 h-4" />
                                Copy
                            </div>
                        </button>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden mt-4">
                    <div className="h-full overflow-y-auto rounded-lg border border-border max-h-[500px]">
                        <SyntaxHighlighter
                            className={cn("!m-0 !bg-[#282a36]", className)}
                            showLineNumbers={true}
                            wrapLines={true}
                            lineProps={{
                                style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
                            }}
                            language={language ? language : "plaintext"}
                            style={dracula}
                        >
                            {code ?? ""}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
