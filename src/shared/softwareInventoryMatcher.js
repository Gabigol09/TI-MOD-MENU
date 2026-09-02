import softwareInventory from '../main/softwareInventoryCore.cjs'

export const {
  cleanString,
  comparisonValue,
  normalizeVersion,
  normalizeSoftwareEntry,
  normalizeAndDeduplicate,
  matchCatalogItem,
} = softwareInventory
