import { forwardRef } from 'react'

const variants = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
  danger: 'button button-danger'
}

const Button = forwardRef(function Button(
  { variant = 'primary', className = '', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${variants[variant] || variants.primary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-forest ${className}`.trim()}
      {...props}
    />
  )
})

export default Button
