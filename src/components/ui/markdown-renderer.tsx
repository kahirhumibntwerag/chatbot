'use client'
import React, { JSX, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

interface MarkdownRendererProps {
  children: string
}

export default function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="space-y-3">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </Markdown>
    </div>
  )
}

interface HighlightedPreProps extends React.HTMLAttributes<HTMLPreElement> {
  children: string
  language: string
}

const HighlightedPre = React.memo(
  ({ children, language, ...props }: HighlightedPreProps) => {
    const { theme } = useTheme()
    const [html, setHtml] = useState("")

    useEffect(() => {
      const highlight = async () => {
        const { codeToHtml, bundledLanguages } = await import("shiki")
        const shikiTheme = theme === "dark" ? "github-dark" : "github-light"

        if (language in bundledLanguages) {
          const newHtml = await codeToHtml(children, {
            lang: language as keyof typeof bundledLanguages,
            theme: shikiTheme,
          })
          setHtml(newHtml)
        } else {
          // Fallback for unsupported languages
          const fallbackHtml = await codeToHtml(children, {
            lang: "text",
            theme: shikiTheme,
          })
          setHtml(fallbackHtml)
        }
      }
      highlight()
    }, [children, language, theme])

    if (!html) {
      // Render unstyled code while shiki is loading
      return (
        <pre {...props}>
          <code>{children}</code>
        </pre>
      )
    }

    return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />
  }
)
HighlightedPre.displayName = "HighlightedPre"

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode
  className?: string
  language: string
}

const CodeBlock = ({
  children,
  className,
  language,
  ...restProps
}: CodeBlockProps) => {
  const code =
    typeof children === "string"
      ? children
      : childrenTakeAllStringContents(children)

  const preClass = cn(
    "overflow-x-scroll rounded-md border p-4 font-mono text-sm [scrollbar-width:none]",
    className
  )

  return (
    <div className="group/code relative mb-4">
      <HighlightedPre language={language} className={preClass} {...restProps}>
        {code}
      </HighlightedPre>

      <div className="invisible absolute right-2 top-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-all duration-200 group-hover/code:visible group-hover/code:opacity-100">
        <CopyButton content={code} copyMessage="Copied code to clipboard" />
      </div>
    </div>
  )
}

function childrenTakeAllStringContents(element: any): string {
  if (typeof element === "string") {
    return element
  }

  if (element?.props?.children) {
    let children = element.props.children

    if (Array.isArray(children)) {
      return children
        .map((child) => childrenTakeAllStringContents(child))
        .join("")
    } else {
      return childrenTakeAllStringContents(children)
    }
  }

  return ""
}

const COMPONENTS = {
  h1: withClass("h1", "text-2xl font-semibold"),
  h2: withClass("h2", "font-semibold text-xl"),
  h3: withClass("h3", "font-semibold text-lg"),
  h4: withClass("h4", "font-semibold text-base"),
  h5: withClass("h5", "font-medium"),
  strong: withClass("strong", "font-semibold"),
  a: withClass("a", "text-primary underline underline-offset-2"),
  blockquote: withClass("blockquote", "border-l-2 border-primary pl-4"),
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "")
    if (match) {
      return (
        <CodeBlock language={match[1]} {...props}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      )
    }
    return (
      <code
        className={cn(
          "font-mono [:not(pre)>&]:rounded-md [:not(pre)>&]:bg-background/50 [:not(pre)>&]:px-1 [:not(pre)>&]:py-0.5",
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }: any) => <>{children}</>,
  ol: withClass("ol", "list-decimal space-y-2 pl-6"),
  ul: withClass("ul", "list-disc space-y-2 pl-6"),
  li: withClass("li", "my-1.5"),
  table: withClass(
    "table",
    "w-full border-collapse overflow-y-auto rounded-md border border-foreground/20"
  ),
  th: withClass(
    "th",
    "border border-foreground/20 px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  td: withClass(
    "td",
    "border border-foreground/20 px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  tr: withClass("tr", "m-0 border-t p-0 even:bg-muted"),
  p: withClass("p", "whitespace-pre-wrap"),
  hr: withClass("hr", "border-foreground/20"),
}

function withClass(Tag: keyof JSX.IntrinsicElements, classes: string) {
  const Component = ({ node, ...props }: any) => (
    <Tag className={classes} {...props} />
  )
  Component.displayName = Tag
  return Component
}

