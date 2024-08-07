import { corsEventHandler } from 'nitro-cors'

export default corsEventHandler(
  (_event) => {
    /** no-op */
  },
  {
    origin: '*',
    methods: '*'
  }
)
