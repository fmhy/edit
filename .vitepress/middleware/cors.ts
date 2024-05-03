import cors from 'nitro-cors'

const corsHandler = cors({
  origin: '*',
  methods: '*'
})

export default corsHandler

