// controllers/concert/index.ts

// Concert Basic CRUD Operations
export {
  uploadConcert,
  getConcert,
  getAllConcerts,
  updateConcert,
  deleteConcert,
} from "./concertController";

// Concert Like Operations
export {
  getLikeStatus,
  addLike,
  removeLike,
  getLikedConcerts,
} from "./concertLikeController";

// Concert Search & Filter Operations
export {
  searchConcerts,
  getUpcomingConcerts,
  getPopularConcerts,
  getTicketOpenConcerts,
  getConcertsByArtist,
  getConcertsByLocation,
  getConcertsByCategory,
  getConcertsByStatus,
  getConcertStats,
} from "./concertSearchController";

// Concert Batch Operations
export {
  batchUploadConcerts,
  batchUpdateConcerts,
  batchDeleteConcerts,
  batchLikeConcerts,
} from "./concertBatchController";

// Concert Validation & Utility Functions
export {
  validateConcertData,
  generateObjectIdFromUid,
  isValidImageUrl,
  isValidConcertStatus,
  isValidMusicCategory,
  validateAndNormalizePagination,
  isValidDateString,
  isValidSortBy,
  validateAndNormalizeBatchSize,
  normalizeConcertData,
  normalizeSearchQuery,
  formatValidationError,
} from "../../utils/validation/concert/concertValidation";

// Concert Validation Types
export type { ValidationResult } from "../../utils/validation/concert/concertValidation";
