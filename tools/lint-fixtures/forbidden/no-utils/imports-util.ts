// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// The import edge of the no-utils negative test (22 §6). Importing a catch-all `utils`
// bucket is the boundary violation dependency-cruiser catches at the import edge.
import { u } from "./utils.js";

export const viaUtil = () => u;
