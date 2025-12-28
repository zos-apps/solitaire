# 🃏 Solitaire

Classic Klondike solitaire card game

## Category
`games`

## Installation

```bash
npm install @anthropic/solitaire
# or
pnpm add @anthropic/solitaire
```

## Usage

```tsx
import App from '@anthropic/solitaire';

function MyComponent() {
  return <App onClose={() => console.log('closed')} />;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev
```

## zOS Integration

This app is designed to run within zOS, a web-based operating system. It follows the zOS app specification with:

- Standalone React component
- TypeScript support
- Tailwind CSS styling
- Window management integration

## License

MIT
