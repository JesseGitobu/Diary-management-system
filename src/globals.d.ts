// Declare CSS module types for global styles
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
