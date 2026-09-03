# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# document-workflow
- When analyzing documents for potential edits, do not modify them directly — instead report what changes are needed and let the user/another person handle modifications. Confidence: 0.80
- Wants design/documentation reference files (e.g. `design.md`) saved at the project root, capturing a reference site's design language (typography, colors, layout) for reuse in their own project. Explicitly repeats this workflow across requests and then wants the captured design adopted into their own portfolio ("use this portfolio in my portfolio"). Confidence: 0.7

# prose-custom
- Keep prose-custom font size moderate (no larger than 1.25rem for body text). Confidence: 0.65

# mcp
- When troubleshooting MCP server connectivity issues, check CommandCode's own configuration files (e.g., `~/.commandcode/mcp.json`) rather than Claude Desktop's `claude_desktop_config.json`. Confidence: 0.80

# typography
See [typography/taste.md](typography/taste.md)
# content
- For blog posts, prefer a simple draft/published binary over a digital garden maturity system (seedling/budding/evergreen). Drafts may optionally include a due date for publishing. Confidence: 0.65

# tech-decisions
- When evaluating a technology or framework change for their project, present a pros-and-cons analysis rather than a single recommendation. Confidence: 0.70

# feature-workflow
- Prefers new features to be self-contained additions — new collections/pages/components/data files only, with existing code left untouched (minimal additive change only when unavoidable). Confidence: 0.65
- When removing a feature/section, prefers a complete site-wide removal (strip all references: nav links, routes, components, content, data, utils, tests, build/package scripts) rather than just unlinking it. Confidence: 0.60
- New pages/routes should be linked from the site's navbar (placed logically among existing links, with the same active-state pattern) so they are discoverable. Confidence: 0.7

# data
- Prefers curated static reference data maintained in-repo (with verification dates) over third-party APIs or crowd-sourced databases when a feature depends on reference data that is hard to source reliably. Confidence: 0.55
- Expects factual data shown to visitors (e.g., product prices) to be accurate and current — verify against official sources where possible and flag any values that couldn't be confirmed rather than shipping guesses. Confidence: 0.6

# ui
- Prefers range sliders with a live value readout over dropdown selects for numeric filter dimensions (price, compliance) in filter UIs. Confidence: 0.65

