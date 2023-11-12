import { corsEventHandler } from "nitro-cors";

export default corsEventHandler((_event) => {}, {
  origin: "*",
  methods: "*",
});
