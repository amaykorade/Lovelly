import React, { useMemo, useCallback } from 'react';
import {
  Pressable,
  Text,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { cn } from '../../../lib/utils';

import { buttonClassNames, textClassNames, iconColors } from './styles';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  mode?: 'light' | 'dark';
  children: React.ReactNode;
  asChild?: boolean;
}

// Type for icon elements
interface IconElement extends React.ReactElement {
  props: {
    svg?: boolean;
    color?: string;
    className?: string;
    [key: string]: any;
  };
  type: string | React.JSXElementConstructor<any>;
}

const Button = React.memo<ButtonProps>(({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  className = '',
  textClassName = '',
  style,
  mode = 'light',
  onPress,
  ...props
}) => {
  // Memoize classes to avoid recalculation
  const containerClasses = useMemo(() => cn(
    buttonClassNames.base,
    buttonClassNames[`size_${size}`],
    buttonClassNames[`${mode}_variant_${variant}`],
    disabled && buttonClassNames.disabled,
    className
  ), [size, mode, variant, disabled, className]);

  const textClasses = useMemo(() => cn(
    textClassNames.base,
    textClassNames.size[size],
    textClassNames[mode][variant],
    textClassName
  ), [size, mode, variant, textClassName]);

  const isIconButton = size === 'icon';

  // Optimize press handler - use useCallback and immediate execution
  const handlePress = useCallback((e: any) => {
    if (!disabled && onPress) {
      // Use requestAnimationFrame for immediate response
      requestAnimationFrame(() => {
        onPress(e);
      });
    }
  }, [disabled, onPress]);

  // Memoize children processing
  const processedChildren = useMemo(() => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        const elementChild = child as IconElement;

        if (elementChild.type === 'svg' || elementChild.props.svg) {
          return React.cloneElement(elementChild, {
            ...elementChild.props,
            size: isIconButton ? 20 : 16,
            color: elementChild.props.color || iconColors[mode][variant],
            className: cn(
              isIconButton ? 'w-5 h-5' : 'w-4 h-4 shrink-0',
              elementChild.props.className
            ),
          });
        }
      }

      if (typeof child === 'string' || typeof child === 'number') {
        return <Text className={textClasses}>{child}</Text>;
      }

      return child;
    });
  }, [children, isIconButton, mode, variant, textClasses]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={handlePress}
      android_ripple={variant !== 'link' ? { 
        color: 'rgba(0, 0, 0, 0.1)',
        borderless: false,
      } : null}
      className={containerClasses}
      style={style}
    >
      {processedChildren}
    </Pressable>
  );
});

Button.displayName = 'Button';

export default Button;
