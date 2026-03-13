export type FilterOperator = {
    eq?: string | number,
    ne?: string | number,
    in?: string[] | number[],
    contains?: string | number,
  }