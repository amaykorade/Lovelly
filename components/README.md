# Components Directory

This directory contains reusable UI components for your React Native app using NativeCN (shadcn/ui for React Native).

## Adding Components

To add a component from NativeCN, use the CLI:

```bash
npx @nativecn/cli add [component-name]
```

For example, to add a button component:

```bash
npx @nativecn/cli add button
```

## Available Components

You can add any of the following components:
- `button` - Button component with variants
- `card` - Card container component
- `input` - Input field component
- `label` - Label component
- `text` - Text component with variants
- `switch` - Switch toggle component
- `checkbox` - Checkbox component
- `radio-group` - Radio group component
- `slider` - Slider component
- `progress` - Progress bar component
- `avatar` - Avatar component
- `badge` - Badge component
- `separator` - Separator line component
- And more...

## Usage Example

After adding a component, import and use it in your app:

```jsx
import { Button } from './components/ui/button';

export default function MyScreen() {
  return (
    <Button className="bg-primary">
      Click Me
    </Button>
  );
}
```

## Customization

All components are copied directly into your project, so you can customize them as needed. They use Tailwind CSS classes via NativeWind, so you can modify styles using standard Tailwind utilities.

For more information, visit: https://github.com/tailwiinder/nativecn

