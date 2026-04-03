"use client";

import { ConfigContext } from "./config-context";
import { useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
    alt?: string;
}

const Logo = ({ width = 64, height = 32, className = "", alt = "Logo" }: LogoProps) => {
    const configContext = useContext(ConfigContext);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const src = mounted && resolvedTheme === "dark"
        ? configContext?.backend + "/logo_dark.png"
        : configContext?.backend + "/logo_light.png";

    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
        />
    )
}

export default Logo;