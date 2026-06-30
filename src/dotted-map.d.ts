declare module "dotted-map" {
  export default class DottedMap {
    constructor(options: { height: number; grid: string });
    getSVG(options: {
      radius: number;
      color: string;
      shape: string;
      backgroundColor: string;
    }): string;
  }
}
