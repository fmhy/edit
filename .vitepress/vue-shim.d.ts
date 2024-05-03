// .d.ts file

// Enable type checking for .vue files
declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

// Enable type checking for .scss files
declare module '*.scss' {
  const styles: { [className: string]: string }
  export = styles
}

// Enable type checking for .css files
declare module '*.css' {
  const styles: { [className: string]: string }
  export = styles
}

