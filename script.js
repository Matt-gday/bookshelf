console.log("Bookshelf app script loaded. Waiting for DOMContentLoaded...");

// --- START: Define Missing UI Interaction Functions ---
function showSearchModal() {
    console.log("showSearchModal called");
    const modal = document.getElementById('search-modal');
    if (modal) showModal(modal); // Uses the existing generic showModal
}

function hideSearchModal() {
    console.log("hideSearchModal called");
    const modal = document.getElementById('search-modal');
    if (modal) hideModal(modal); // Uses the existing generic hideModal
}

function showFilterModal() {
    console.log("showFilterModal called");
    const modal = document.getElementById('filter-modal');
    if (modal) showModal(modal);
}

function hideFilterModal() {
    console.log("hideFilterModal called");
    const modal = document.getElementById('filter-modal');
    if (modal) hideModal(modal); // Uses the existing generic hideModal
}

function showBookDetailModal(bookId) {
    console.log("showBookDetailModal called with bookId:", bookId);
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        console.error("Book not found for detail modal:", bookId);
        return;
    }

    detailModalBookId = bookId; // Set the global tracker

    // Populate the modal fields
    if (detailCover) detailCover.src = book.displayCoverUrl;
    if (detailTitle) detailTitle.textContent = book.title;
    if (detailAuthor) detailAuthor.textContent = book.authors.join(', ');
    if (detailSeries) {
        if (book.seriesTitle) {
            detailSeries.textContent = `${book.seriesTitle}${book.seriesNumber ? ' #' + book.seriesNumber : ''}`;
            detailSeries.style.display = 'block';
        } else {
            detailSeries.textContent = '';
            detailSeries.style.display = 'none';
        }
    }
    if (detailRating) detailRating.innerHTML = book.personalRating ? renderStars(book.personalRating) : 'Not Rated';
    
    // Review section
    const reviewSection = document.getElementById('detail-review-section');
    const reviewText = document.getElementById('detail-review-text');
    if (reviewSection && reviewText) {
        if (book.review && book.review.trim() !== '') {
            reviewText.textContent = book.review;
            reviewSection.style.display = 'block';
        } else {
            reviewText.textContent = '';
            reviewSection.style.display = 'none';
        }
    }

    if (detailStatus) detailStatus.textContent = book.status || 'N/A';
    if (detailReader) detailReader.textContent = book.reader || 'N/A';
    if (detailDateAdded) detailDateAdded.textContent = formatDisplayDate(book.dateAdded);
    if (detailDateFinished) detailDateFinished.textContent = book.dateFinished ? formatDisplayDate(book.dateFinished) : 'N/A';
    if (detailPageCount) detailPageCount.textContent = book.effectivePageCount || 'N/A';
    if (detailIsbn) detailIsbn.textContent = book.isbn || 'N/A';
    if (detailPublisher) detailPublisher.textContent = book.publisher || 'N/A';
    if (detailPublicationYear) detailPublicationYear.textContent = book.publicationYear || 'N/A';
    if (detailTags) detailTags.textContent = book.customTags && book.customTags.length > 0 ? book.customTags.join(', ') : 'None';
    if (detailSynopsis) detailSynopsis.textContent = book.synopsis || 'No synopsis available.';

    const modal = document.getElementById('book-detail-modal');
    if (modal) {
        showModal(modal);
    }
}

function hideBookDetailModal() {
    console.log("hideBookDetailModal called");
    const modal = document.getElementById('book-detail-modal');
    if (modal) hideModal(modal);
    detailModalBookId = null; // Clear the active book ID
}

function setActiveNavButtons() {
    console.log("[setActiveNavButtons] Updating active states for bottom navigation.");

    const homeBtn = document.getElementById('home-nav-btn');
    const addBtn = document.getElementById('add-nav-btn');
    const searchBtn = document.getElementById('search-nav-btn');
    const wishlistBtn = document.getElementById('wishlist-nav-btn');
    const filterBtn = document.getElementById('filter-nav-btn');

    const buttons = [homeBtn, addBtn, searchBtn, wishlistBtn, filterBtn];

    // Remove active class from all buttons first
    buttons.forEach(btn => {
        if (btn) btn.classList.remove('active');
    });

    // Determine primary active button (Home, Add, Search, Wishlist)
    if (isAddingBook || document.getElementById('isbn-input-container').classList.contains('visible')) {
        if (addBtn) addBtn.classList.add('active');
        console.log("[setActiveNavButtons] Add button is primary active.");
    } else if (isSearchActive) {
        if (searchBtn) searchBtn.classList.add('active');
        console.log("[setActiveNavButtons] Search button is primary active.");
    } else if (isWishlistViewActive) {
        if (wishlistBtn) wishlistBtn.classList.add('active');
        console.log("[setActiveNavButtons] Wishlist button is primary active.");
    } else {
        // Default to home/library view if no other specific state is active
        if (homeBtn) homeBtn.classList.add('active');
        console.log("[setActiveNavButtons] Home button is primary active (default).");
    }

    // Independently activate filter button if filters are active
    if (isFilterActive) {
        if (filterBtn) filterBtn.classList.add('active');
        console.log("[setActiveNavButtons] Filter button is also active.");
    }
}

function handleSynopsisEditClick(event) {
    console.log("handleSynopsisEditClick called", event);
    // In a real implementation, this would toggle synopsis edit mode
    const synopsisDisplay = document.getElementById('synopsis-display-text');
    const synopsisInput = document.getElementById('synopsis-edit-input');
    if (synopsisDisplay && synopsisInput) {
        if (synopsisInput.style.display === 'none') {
            synopsisDisplay.style.display = 'none';
            synopsisInput.style.display = 'block';
            synopsisInput.focus();
        } else {
            synopsisDisplay.textContent = synopsisInput.value;
            synopsisDisplay.style.display = 'block';
            synopsisInput.style.display = 'none';
        }
    }
}

function validateFormAndToggleButtonState(isSubmitting = false) {
    if (!addBookForm || !saveBookBtn) {
        console.warn("validateFormAndToggleButtonState: Form or save button not found.");
        return false; // Return validity state
    }

    const formElements = addBookForm.elements;
    let firstInvalidElement = null;

    // Clear previous errors and check validity for each element
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        // Remove existing error class
        element.classList.remove('input-error');
        // For radio groups, check the group as a whole and style a parent container if needed
        if (element.type === 'radio' && element.name) {
            const radioGroupName = element.name;
            const radioGroup = addBookForm.querySelectorAll(`input[name="${radioGroupName}"]`);
            let isGroupValid = false;
            radioGroup.forEach(radio => {
                if (radio.checked) isGroupValid = true;
            });
            const groupContainer = element.closest('.form-group') || element.closest('.radio-group-container'); // Find a suitable parent
            if (groupContainer) {
                groupContainer.classList.remove('input-error-group'); // Clear group error
                if (!isGroupValid && element.required) { // Only add error if group is required and invalid
                    groupContainer.classList.add('input-error-group');
                    if (!firstInvalidElement) {
                        // For radio groups, focusing the first radio is a common approach
                        firstInvalidElement = radioGroup[0]; 
                    }
                }
            }
        } else if (element.willValidate) { // Check elements that can be validated
            if (!element.checkValidity()) {
                element.classList.add('input-error');
                if (!firstInvalidElement) {
                    firstInvalidElement = element;
                }
            }
        }
    }

    const isFormValid = addBookForm.checkValidity();
    // saveBookBtn.disabled = !isFormValid; // Removed this line to keep the button enabled

    if (isSubmitting && !isFormValid) {
        console.warn("[Validation] Form is invalid on submit attempt.");
        // addBookForm.reportValidity(); // Browser native popups (can be kept or removed based on preference)
        
        if (firstInvalidElement) {
            console.log("[Validation] Focusing first invalid element:", firstInvalidElement.id || firstInvalidElement.name);
            firstInvalidElement.focus();
            // Scroll into view, with a small timeout if focus itself might trigger layout shifts
            setTimeout(() => {
                 firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50); 
        }
    }
    console.log(`Form valid: ${isFormValid}, Save button disabled: ${saveBookBtn ? saveBookBtn.disabled : 'not found (should be enabled)'}`); // Modified log
    return isFormValid; // Return the overall validity state
}

function hideAddBookModal() {
    console.log("[hideAddBookModal] Hiding Add/Edit Book modal.");
    if (addBookFormContainer) {
        hideModal(addBookFormContainer);
    }

    if (addBookForm) {
        addBookForm.reset();
    }
    currentUserCoverUrl = null;
    customCoverRemoved = false;
    currentlyEditingBookId = null; 
    currentlyFetchedApiData = null;
    // isAddingBook = false; // Will be set as part of view restoration

    const userCoverUrlInputElement = document.getElementById('userCoverImageUrl');
    if (userCoverUrlInputElement) userCoverUrlInputElement.value = '';

    if (formCoverPreview) {
        formCoverPreview.src = 'placeholder-cover.png';
        formCoverPreview.style.display = 'none';
        formCoverPreview.classList.remove('custom-cover', 'api-cover');
        formCoverPreview.classList.add('placeholder');
    }
    if (removeCustomCoverBtn) {
        removeCustomCoverBtn.style.display = 'none';
        removeCustomCoverBtn.disabled = true;
    }
    const synopsisDisplay = addBookForm ? addBookForm.querySelector('.synopsis-display-area') : null;
    const synopsisInput = addBookForm ? addBookForm.querySelector('#synopsis-edit-input') : null;
    if (synopsisDisplay) synopsisDisplay.style.display = 'block';
    if (synopsisInput) synopsisInput.style.display = 'none';
    const synopsisDisplayText = addBookForm ? addBookForm.querySelector('#synopsis-display-text') : null;
    if (synopsisDisplayText) synopsisDisplayText.textContent = '';
    if (apiGenresDisplay) apiGenresDisplay.innerHTML = '';
    
    // Restore previous view state
    isAddingBook = false; // Crucial to do this before setting other views
    if (previousViewBeforeAdd === 'search') {
        isSearchActive = true;
        isLibraryViewActive = false;
        isWishlistViewActive = false;
        console.log("[hideAddBookModal] Restoring to Search view.");
    } else if (previousViewBeforeAdd === 'wishlist') {
        isWishlistViewActive = true;
        isLibraryViewActive = false;
        isSearchActive = false;
        console.log("[hideAddBookModal] Restoring to Wishlist view.");
    } else { // 'home' or default
        isLibraryViewActive = true;
        isSearchActive = false;
        isWishlistViewActive = false;
        console.log("[hideAddBookModal] Restoring to Home/Library view.");
    }
    // previousViewBeforeAdd = null; // Optional: reset to avoid unintended carry-over

    setActiveNavButtons();
    validateFormAndToggleButtonState(false); 
    renderBooks(); // Re-render books for the restored view
}

function showSettingsModal() {
    console.log("showSettingsModal called");
    const modal = document.getElementById('settings-modal');
    if (modal) {
        showModal(modal); // Uses the existing generic showModal

        // Get buttons and attach listeners when modal is shown
        const exportDataBtn = document.getElementById('export-data-btn');
        const importDataBtn = document.getElementById('import-data-btn');
        const csvFileInput = document.getElementById('csv-file-input'); // Assuming this is inside settings modal or globally accessible

        if (exportDataBtn) {
            console.log("[showSettingsModal] Attaching listener to exportDataBtn.");
            // Remove existing listener to prevent duplicates if modal is reshown
            exportDataBtn.removeEventListener('click', handleExportData);
            exportDataBtn.addEventListener('click', handleExportData);
        } else {
            console.warn("[showSettingsModal] exportDataBtn not found in settings modal.");
        }

        if (importDataBtn) {
            console.log("[showSettingsModal] Attaching listener to importDataBtn.");
            importDataBtn.removeEventListener('click', handleImportDataTrigger);
            importDataBtn.addEventListener('click', handleImportDataTrigger);
        } else {
            console.warn("[showSettingsModal] importDataBtn not found in settings modal.");
        }

        if (csvFileInput) {
            console.log("[showSettingsModal] Attaching listener to csvFileInput.");
            csvFileInput.removeEventListener('change', processImportedCsv);
            csvFileInput.addEventListener('change', processImportedCsv);
        } else {
            // This might be okay if csvFileInput is truly global and not part of settings modal content
            // but if it's meant to be inside, this warning is important.
            console.warn("[showSettingsModal] csvFileInput not found. If it's specific to import, ensure it's in settings modal or accessible.");
        }
    }
}

function hideSettingsModal() {
    console.log("hideSettingsModal called");
    const modal = document.getElementById('settings-modal');
    if (modal) hideModal(modal); // Uses the existing generic hideModal
}
// --- END: Define Missing UI Interaction Functions ---

// --- Data Model ---
class BookV2 {
    constructor(
        isbn = '', title = '', authors = [], coverImageUrl = '', synopsis = '',
        publisher = '', publicationYear = '', pageCount = null, apiGenres = [],
        apiSeriesTitle = '', apiSeriesNumber = '', reader = '', status = '',
        personalRating = null, dateAdded = new Date().toISOString(), dateFinished = null,
        customTags = [], userSeriesTitle = '',
        userSeriesNumber = '', userPageCount = null, userCoverImageUrl = null,
        review = ''
    ) {
        this.isbn = isbn;
        this.title = title;
        this.authors = Array.isArray(authors) ? authors : (authors ? [authors] : []);
        this.coverImageUrl = coverImageUrl;
        this.synopsis = synopsis;
        this.publisher = publisher;
        this.publicationYear = publicationYear;
        this.pageCount = pageCount;
        this.apiGenres = Array.isArray(apiGenres) ? apiGenres : (apiGenres ? [apiGenres] : []);
        this.apiSeriesTitle = apiSeriesTitle;
        this.apiSeriesNumber = apiSeriesNumber;
        this.reader = reader;
        this.status = status;
        this.personalRating = personalRating;
        this.dateAdded = dateAdded;
        this.dateFinished = dateFinished;
        this.customTags = Array.isArray(customTags) ? customTags : (customTags ? [customTags] : []);
        this.userSeriesTitle = userSeriesTitle;
        this.userSeriesNumber = userSeriesNumber;
        this.userPageCount = userPageCount;
        this.userCoverImageUrl = userCoverImageUrl;
        this.review = review;
        this.id = isbn || `${title}-${dateAdded}`;
    }
    get seriesTitle() { return this.userSeriesTitle || this.apiSeriesTitle; }
    get seriesNumber() { return this.userSeriesNumber || this.apiSeriesNumber; }
    get effectivePageCount() { return this.userPageCount !== null ? this.userPageCount : this.pageCount; }
    get displayCoverUrl() { return this.userCoverImageUrl || this.coverImageUrl || 'placeholder-cover.png'; }
}

// --- Local Storage Interaction ---
const STORAGE_KEY = 'victoriaBookshelfData';
const SERIES_STORAGE_KEY = 'victoriaBookshelfSeriesTitles';
const VIEW_MODE_STORAGE_KEY = 'victoriaBookshelfViewMode'; // For current view
const DARK_MODE_STORAGE_KEY = 'darkMode'; // Explicitly define for clarity
function loadBooksFromStorage() {
    const jsonData = localStorage.getItem(STORAGE_KEY);
    console.log("[loadBooks] Loaded JSON from localStorage (first 200 chars):", jsonData ? jsonData.substring(0, 200) + '...' : 'null');
    if (!jsonData) { return []; }
    try {
        const loadedData = JSON.parse(jsonData);
        console.log(`[loadBooks] Parsed ${loadedData.length} raw book objects from JSON.`);
        return loadedData.map((data, index) => {
            if (data.userCoverImageUrl) {
                console.log(`[loadBooks] Reconstructing book with custom cover URL: ${data.title}, URL: ${data.userCoverImageUrl}`);
            }
            // Log cover URLs for the first few books being reconstructed
            else if (index < 3) { // Log first 3 API covers if no custom cover
                 console.log(`[loadBooks] Reconstructing book ${index} (no custom cover): Title=${data.title}, API Cover=${data.coverImageUrl}`);
            }
            return new BookV2(
                data.isbn, data.title, data.authors, data.coverImageUrl, data.synopsis,
                data.publisher, data.publicationYear, data.pageCount, data.apiGenres,
                data.apiSeriesTitle, data.apiSeriesNumber, data.reader, data.status,
                data.personalRating, data.dateAdded, data.dateFinished, data.customTags,
                data.userSeriesTitle, data.userSeriesNumber, data.userPageCount,
                data.userCoverImageUrl, data.review || ''
            );
        });
    } catch (error) {
        console.error("[loadBooks] Error parsing or reconstructing book data:", error);
        return []; // Return empty array on error to prevent further issues
    }
}
function saveBooksToStorage(books) {
    if (!Array.isArray(books)) { console.error("Invalid data type for saving books."); return; }
    // Log cover URLs for the first few books being saved
    console.log(`[saveBooks] Attempting to save ${books.length} books.`);
    books.forEach((book, index) => {
        if (book.userCoverImageUrl) {
            console.log(`[saveBooks] Book with custom cover URL: ${book.title}, URL: ${book.userCoverImageUrl}`);
        } else if (index < 3) { // Log API covers only for first few if no custom cover
             console.log(`[saveBooks] Book ${index} to save (no custom cover): Title=${book.title}, API Cover=${book.coverImageUrl}`);
        }
    });
    try { 
        const jsonToSave = JSON.stringify(books);
        console.log("[saveBooks] Saving JSON (first 200 chars):", jsonToSave.substring(0, 200) + '...'); // Log start of JSON
        localStorage.setItem(STORAGE_KEY, jsonToSave); 
    } catch (error) { 
        console.error("[saveBooks] Error saving book data during stringify or setItem:", error); 
    }
}
function loadSeriesTitles() {
    const jsonData = localStorage.getItem(SERIES_STORAGE_KEY);
    try { return [...new Set(JSON.parse(jsonData || '[]').filter(t => typeof t === 'string'))]; } catch (error) { console.error("Error parsing series titles:", error); return []; }
}
function saveSeriesTitles(seriesTitles) {
    if (!Array.isArray(seriesTitles)) { console.error("Invalid data type for saving series titles."); return; }
    try { localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify([...new Set(seriesTitles.filter(Boolean))].sort())); } catch (error) { console.error("Error saving series titles:", error); }
}

// --- Global State ---
let allBooks = [];
let currentView = localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'grid'; // Load saved view or default to grid
let currentlyFetchedApiData = null;
let currentlyEditingBookId = null;
let isSearchActive = false;
let currentSearchTerm = '';
let isWishlistViewActive = false;
let activeFilters = {
    status: [],
    reader: [],
    targetRating: 0 // Removed genre/tag
};
let isFilterActive = false;
let currentSort = { field: 'dateAdded', direction: 'desc' };

// Navigation state tracking
let previousViewBeforeAdd = null; // Tracks whether library or wishlist was active before add
let isAddingBook = false; // Flag to track if we're in the add book process
let addBookCancelled = false; // Flag to track if add book was cancelled
let viewBeforeFilter = 'library'; // To remember view before opening filter modal

// Rating Modal State
let currentRatingBookId = null;
let currentRatingValue = 0;
let currentReviewValue = '';
let initialRatingValue = 0;
let initialReviewValue = '';
let isInitialRatingMode = true; // Keep for potential future use
let isRatingInteractionActive = false;

// Detail Modal State
let detailModalBookId = null;

// User Cover URL State
let currentUserCoverUrl = null; // Renamed from selectedCoverImageDataUrl
let customCoverRemoved = false; // Re-add flag

// --- START: Helper function for series detection ---
function detectSeriesInfoFromTitle(title) {
    if (!title) return { seriesTitle: '', seriesNumber: '' };

    // Regex to capture series title and number (Arabic or Roman numerals)
    // Example: "Series Title (Book 1)", "Series Title #2", "Series: Vol. III"
    const seriesPatterns = [
        /(.+?)(?:\\s*\\(\\s*Book\\s+(?![IVXLCDM]+\\b)|\\s*-\\s+Book\\s+|\\s+#|\\s*Vol(?:ume)?\\.\\s+|\\s*Book\\s+|\\s*Series\\s+)?(\\d+)\\s*\\)?$/i, // Numeric ending
        /(.+?)(?:\\s*\\(\\s*Book\\s+(?=[IVXLCDM]+\\b)|\\s*-\\s+Book\\s+|\\s+#|\\s*Vol(?:ume)?\\.\\s+|\\s*Book\\s+|\\s*Series\\s+)?([IVXLCDM]+)\\s*\\)?$/i, // Roman numeral ending
        /(.+?):\\s*(?:Book\\s+|Vol(?:ume)?\\.\\s*)?(\\d+|[IVXLCDM]+)/i, // "Title: Book X" or "Title: Vol X"
        /(.+?)\\s+-\\s+(?:Book\\s+|Vol(?:ume)?\\.\\s*)?(\\d+|[IVXLCDM]+)/i, // "Title - Book X"
        /(.+?)(?:,\\s*A\\s+.*?\\s+Novel|,\\s*Book\\s*|\\s*;\\s*Book\\s*)(\\d+|[IVXLCDM]+)?$/i // Common suffixes like ", A [Series Name] Novel" or ", Book 1"
    ];

    for (const pattern of seriesPatterns) {
        const match = title.match(pattern);
        if (match && match[1]) {
            let seriesTitle = match[1].trim();
            let seriesNumber = match[2] ? match[2].trim() : '';

            // Remove common leading/trailing noise from detected series title
            seriesTitle = seriesTitle.replace(/^(The\\s+|A\\s+)/i, '').trim(); // Remove leading "The " or "A "
            seriesTitle = seriesTitle.replace(/\\s*Series$/i, '').trim(); // Remove trailing " Series"
            seriesTitle = seriesTitle.replace(/\\s*Collection$/i, '').trim();
            seriesTitle = seriesTitle.replace(/\\s*Trilogy$/i, '').trim();
            seriesTitle = seriesTitle.replace(/\\s*Saga$/i, '').trim();
            seriesTitle = seriesTitle.replace(/\\s*,$/,'').trim(); // trailing comma


            // If series number wasn't found with the primary pattern but the title implies it
            if (!seriesNumber && seriesTitle.toLowerCase().includes("book")) {
                 const numMatch = seriesTitle.match(/book\s+(\d+|[IVXLCDM]+)/i);
                 if (numMatch && numMatch[1]) seriesNumber = numMatch[1];
            }


            // Avoid overly short or generic series titles unless a number is present
            if (seriesTitle.length < 3 && !seriesNumber) continue;
            if (seriesTitle.toLowerCase() === "book" && !seriesNumber) continue;


            if (seriesTitle) { // Ensure a series title was actually captured
                console.log(`[detectSeries] Detected from title "${title}": Series='${seriesTitle}', Number='${seriesNumber}'`);
                return { seriesTitle, seriesNumber };
            }
        }
    }
    return { seriesTitle: '', seriesNumber: '' };
}
// --- END: Helper function for series detection ---

// --- START: New helper function to extract series number given a series title ---
function extractSeriesNumberAfterTitle(bookTitle, seriesTitle) {
    if (!bookTitle || !seriesTitle || seriesTitle.trim() === '') {
        return ''; // No book title or series title to work with
    }

    const escapedSeriesTitle = seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    
    // Regex patterns to find the series number after the series title in the book title.
    // It looks for the series title, followed by common delimiters and then captures the number.
    // Handles cases like: "Series Title: Book 1", "Series Title #2", "Series Title Vol. III", "Series Title - 4"
    // Also handles cases where series title might be at the start of the book title or in parentheses.
    const patterns = [
        // Series title followed by delimiter and number (e.g., "Series Title: 1", "Series Title - Book 2")
        new RegExp(`(?:^|\\s|\\()${escapedSeriesTitle}(?:\\s*[:;,\\uff1a\\uff0d\\-]|\\s+Book|\\s+Vol\\.?|\\s+#)?\\s*([\\dIVXLCDM]+)(?:\\)|\\s|$)`, 'i'),
        // Book title starts with series title then has a number (e.g., "Series Title 1: Rest of title")
        new RegExp(`^${escapedSeriesTitle}\\s+([\\dIVXLCDM]+)(?:[:;,\\-]|\\s+|$)`, 'i'),
        // Series title embedded, then number (e.g. "The Adventures of Tom Sawyer (Tom Sawyer Book 1)" -> series "Tom Sawyer", number "1")
        new RegExp(`${escapedSeriesTitle}.*?(\\d+|[IVXLCDM]+)`, 'i') // More general, might need refinement
    ];

    for (const pattern of patterns) {
        const match = bookTitle.match(pattern);
        if (match && match[1]) {
            const number = match[1].trim();
            // Basic validation: ensure it's a plausible number (Arabic or Roman)
            if (/^[\dIVXLCDM]+$/i.test(number)) {
                console.log(`[extractSeriesNumber] For book "${bookTitle}" and series "${seriesTitle}", found number: "${number}" using pattern: ${pattern}`);
                return number;
            }
        }
    }
    
    console.log(`[extractSeriesNumber] No number found for book "${bookTitle}" and series "${seriesTitle}"`);
    return '';
}
// --- END: New helper function ---


// --- START: Google Books API Interaction ---
async function fetchBookDataFromApi(isbn) {
    if (!isbn || isbn.trim() === "") {
        if (lookupStatusElement) lookupStatusElement.textContent = "Please enter an ISBN.";
        console.warn("[API] ISBN is empty.");
        return;
    }

    const sanitizedIsbn = isbn.replace(/[-\s]/g, "");
    if (lookupStatusElement) lookupStatusElement.textContent = "Looking up ISBN...";
    console.log(`[API] Looking up ISBN: ${sanitizedIsbn}`);

    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${sanitizedIsbn}`);
        if (!response.ok) {
            if (lookupStatusElement) lookupStatusElement.textContent = `Error: ${response.status} ${response.statusText}`;
            console.error(`[API] Network response was not ok: ${response.status}`);
            return;
        }

        const data = await response.json();
        if (data.totalItems > 0 && data.items && data.items.length > 0) {
            const volumeInfo = data.items[0].volumeInfo;
            const bookTitleFromApi = volumeInfo.title || "";
            console.log("[API] Book data received:", volumeInfo);

            let autoDetectedSeriesTitle = "";
            let autoDetectedSeriesNumber = "";

            // Attempt to auto-detect series title from known series list
            const knownSeriesTitles = loadSeriesTitles(); // Assuming this function loads all unique series titles
            if (bookTitleFromApi && knownSeriesTitles.length > 0) {
                for (const knownSeries of knownSeriesTitles) {
                    if (knownSeries.trim() === "") continue; // Skip empty known series titles
                    
                    // More robust check: series title should be a whole word/phrase match followed by a delimiter or end of string/parenthesis
                    // This helps avoid partial matches like "War" in "War and Peace"
                    const escapedKnownSeries = knownSeries.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const seriesMatchPattern = new RegExp(`\\b${escapedKnownSeries}\\b`, 'i'); // Match whole word, case insensitive
                    
                    if (seriesMatchPattern.test(bookTitleFromApi)) {
                        console.log(`[API Series AutoDetect] Found known series "${knownSeries}" in API title "${bookTitleFromApi}"`);
                        autoDetectedSeriesTitle = knownSeries;
                        autoDetectedSeriesNumber = extractSeriesNumberAfterTitle(bookTitleFromApi, knownSeries);
                        break; // First match wins for now
                    }
                }
            }
            
            // If no known series was matched, then try the generic detectSeriesInfoFromTitle as a fallback
            if (!autoDetectedSeriesTitle && bookTitleFromApi) {
                 console.log("[API Series AutoDetect] No known series matched. Trying generic detection from API title.");
                 const genericDetection = detectSeriesInfoFromTitle(bookTitleFromApi);
                 if (genericDetection.seriesTitle) {
                     autoDetectedSeriesTitle = genericDetection.seriesTitle;
                     autoDetectedSeriesNumber = genericDetection.seriesNumber;
                 }
            }

            const parsedBookData = {
                title: bookTitleFromApi,
                authors: volumeInfo.authors || [],
                publisher: volumeInfo.publisher || "",
                publicationYear: volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : "",
                synopsis: volumeInfo.description || "",
                coverImageUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || "",
                pageCount: volumeInfo.pageCount || null,
                apiGenres: volumeInfo.categories || [],
                isbn: sanitizedIsbn,
                apiSeriesTitle: autoDetectedSeriesTitle, 
                apiSeriesNumber: autoDetectedSeriesNumber
            };
            
            currentlyFetchedApiData = parsedBookData;
            if (lookupStatusElement) lookupStatusElement.textContent = "Book data found! Confirm details below.";
            
            hideIsbnInputModal();
            prefillAndShowAddBookForm(currentlyFetchedApiData);

        } else {
            if (lookupStatusElement) lookupStatusElement.textContent = "No book found for this ISBN.";
            console.log("[API] No items found for ISBN.");
        }
    } catch (error) {
        if (lookupStatusElement) lookupStatusElement.textContent = "Failed to fetch book data. Check console.";
        console.error("[API] Error fetching or parsing book data:", error);
    }
}

function handleIsbnLookup() {
    if (isbnManualInput) {
        const isbn = isbnManualInput.value.trim();
        if (isbn) {
            fetchBookDataFromApi(isbn);
        } else {
            if (lookupStatusElement) lookupStatusElement.textContent = "Please enter an ISBN to lookup.";
        }
    } else {
        console.error("ISBN manual input field not found.");
    }
}
// --- END: Google Books API Interaction ---

// --- UI Elements (Declarations at Global Scope) ---
let bookDisplayArea, viewToggleButton, addBookButton, isbnInputContainer, isbnManualInput,
    isbnLookupButton, cancelIsbnInputButton, lookupStatusElement, seriesTitlesDatalist,
    addBookFormContainer, addBookForm, cancelAddBookButton, addBookFormTitle, resetDataButton,
    bookDetailModal, detailCover, detailTitle, detailAuthor, detailSeries, detailRating,
    detailStatus, detailReader, detailDateAdded, detailDateFinished, detailTags,
    detailSynopsis, detailPageCount, detailPublisher, detailPublicationYear, detailIsbn,
    detailNotesSection, detailNotes, editBookBtn, closeDetailBtn, formCoverPreview, apiGenresDisplay,
    saveBookBtn, removeCustomCoverBtn, settingsModal, // Add settingsModal variable
    addManuallyBtn, deleteBookBtn, bookCountDisplayElement, editSynopsisBtn, userCoverImageUrlelement;

// Rating Modal UI Elements (add these to global declarations)
let ratingReviewModal, interactiveStarsContainer, ratingValueDisplay, reviewInput,
    ratingModalTitle, ratingSaveBtn, ratingCancelBtn, ratingCloseBtn,
    reviewDisplayArea, reviewDisplayText, editReviewBtn;

// --- Helper Functions ---
function renderStars(rating, interactive = false) {
    if (!interactive && (rating === null || rating === undefined || rating <= 0)) {
        return '';
    }
    
    const starSvgTemplate = (cls) =>
        `<svg class="rating-star-svg ${cls}" viewBox="0 0 51 48" xmlns="http://www.w3.org/2000/svg">
            <path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"/>
        </svg>`;
        
    let starsHtml = '';
    const totalStars = 5;
    const clampedRating = Math.max(0, Math.min(totalStars, rating || 0));
    
    for (let i = 1; i <= totalStars; i++) {
        let starClass = '';
        if (clampedRating >= i) { 
            starClass = 'filled'; 
        } else if (clampedRating >= i - 0.5) { 
            starClass = 'half-filled'; 
        }
        starsHtml += starSvgTemplate(starClass);
    }
    
    return starsHtml;
}

// Dark Mode Functions
function updateDarkModeUI() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    // Update dark mode button if it exists
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) {
        darkModeBtn.classList.toggle('active', isDarkMode);
        darkModeBtn.setAttribute('aria-pressed', isDarkMode.toString());
    }
    
    console.log(`Dark mode is ${isDarkMode ? 'enabled' : 'disabled'}`);
}

function toggleDarkMode() {
    const currentMode = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', (!currentMode).toString());
    updateDarkModeUI();
}

function formatDisplayDate(dateString) {
    if (typeof dateString !== 'string' || !dateString) { return 'N/A'; }
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            if (/\d{4}-\d{2}-\d{2}/.test(dateString)) {
                const utcDate = new Date(`${dateString}T00:00:00Z`);
                if (!isNaN(utcDate.getTime())) {
                    return utcDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                }
            }
            return 'Invalid Date';
        }
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        if (dateString.length === 10) { options.timeZone = 'UTC'; }
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Error';
    }
}

function populateSeriesDatalist() {
    if (!seriesTitlesDatalist) return;
    const seriesTitles = loadSeriesTitles();
    seriesTitlesDatalist.innerHTML = '';
    seriesTitles.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        seriesTitlesDatalist.appendChild(option);
    });
}

// --- UI Rendering Functions ---
function renderBooks() {
    if (!bookDisplayArea || !bookCountDisplayElement) { // Added bookCountDisplayElement check
        console.error("Unable to find book display area or book count display element");
        return;
    }

    // Get all books first
    let displayBooks = allBooks;
    
    // Apply the appropriate filtering based on view state
    
    // Search takes precedence over wishlist view
    if (isSearchActive && currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        displayBooks = displayBooks.filter(book => {
            return (
                book.title.toLowerCase().includes(searchLower) ||
                book.authors.some(author => author.toLowerCase().includes(searchLower)) ||
                (book.publisher && book.publisher.toLowerCase().includes(searchLower)) ||
                (book.apiGenres && book.apiGenres.some(genre => genre.toLowerCase().includes(searchLower))) ||
                (book.customTags && book.customTags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                (book.seriesTitle && book.seriesTitle.toLowerCase().includes(searchLower))
            );
        });
    } 
    // If not searching, apply wishlist filter if active
    else if (isWishlistViewActive) {
        displayBooks = displayBooks.filter(book => book.status === 'Wishlist');
    } 
    // Default library view - exclude wishlist books
    else {
        displayBooks = displayBooks.filter(book => book.status !== 'Wishlist');
    }

    // Apply active filters
    if (isFilterActive) {
        if (activeFilters.status && activeFilters.status.length > 0) {
            displayBooks = displayBooks.filter(book => activeFilters.status.includes(book.status));
        }
        if (activeFilters.reader && activeFilters.reader.length > 0) {
            displayBooks = displayBooks.filter(book => activeFilters.reader.includes(book.reader));
        }
        // Fix the rating filter to properly handle unrated books and include half stars
        if (activeFilters.targetRating !== 0) {
            displayBooks = displayBooks.filter(book => {
                // Handle the "unrated" special case (-1)
                if (activeFilters.targetRating === -1) {
                    return !book.personalRating; // Only show books with no rating
                }
                
                // For star ratings, include the selected rating and the half-star below
                // For example, if 4 stars is selected, show both 4 and 3.5 star books
                const rating = book.personalRating || 0;
                const minRating = activeFilters.targetRating - 0.5;
                const maxRating = activeFilters.targetRating;
                
                return rating >= minRating && rating <= maxRating;
            });
        }
    }

    // Sort the books
    displayBooks = displayBooks.sort((a, b) => {
            const field = currentSort.field;
        const direction = currentSort.direction;
        const aVal = a[field] ?? '';
        const bVal = b[field] ?? '';
        
        // Handle special cases - nulls should be sorted last, irrespective of direction
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        
        // Handle date comparisons (assuming ISO format strings)
        if (field === 'dateAdded' || field === 'dateFinished') {
            const aDate = aVal ? new Date(aVal).getTime() : 0;
            const bDate = bVal ? new Date(bVal).getTime() : 0;
            return direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        // Handle numeric fields
        if (field === 'pageCount' || field === 'publicationYear' || field === 'personalRating') {
            // Convert to number, defaulting to 0 if NaN
            const aNum = parseFloat(aVal) || 0;
            const bNum = parseFloat(bVal) || 0;
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Handle multi-author case for author sort
        if (field === 'author') {
            const aAuthor = Array.isArray(a.authors) && a.authors.length > 0 ? a.authors[0] : '';
            const bAuthor = Array.isArray(b.authors) && b.authors.length > 0 ? b.authors[0] : '';
            return direction === 'asc' 
                ? aAuthor.localeCompare(bAuthor) 
                : bAuthor.localeCompare(aAuthor);
        }
        
        // Handle series sorting
        if (field === 'series') {
            const aSeries = a.seriesTitle || '';
            const bSeries = b.seriesTitle || '';
            return direction === 'asc' 
                ? aSeries.localeCompare(bSeries) 
                : bSeries.localeCompare(aSeries);
        }
        
        // Default string comparison
        return direction === 'asc' 
            ? aVal.toString().localeCompare(bVal.toString()) 
            : bVal.toString().localeCompare(aVal.toString());
    });

    // Display empty state if no books match
    if (displayBooks.length === 0) {
        let emptyMessage;
        // First check if filters are active - this takes priority
        if (isFilterActive) {
            emptyMessage = 'No books match your filters';
        }
        // Then check search
        else if (isSearchActive) {
            emptyMessage = 'No books match your search';
        }
        // Then check wishlist/library view
        else if (isWishlistViewActive) {
            emptyMessage = 'Your wishlist is empty';
        }
        else {
            emptyMessage = 'Your bookshelf is empty';
        }

        // Update book count display even when empty
        bookCountDisplayElement.textContent = "0 books"; // Simplified message
        
        bookDisplayArea.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">menu_book</span>
                <p>${emptyMessage}.</p>
                <button id="empty-add-book-btn" class="btn-primary">
                    <span class="material-symbols-outlined">add</span> Add a Book
                </button>
            </div>
        `;
        // Add listener for the empty state add button
        const emptyAddBtn = document.getElementById('empty-add-book-btn');
        if (emptyAddBtn) {
            emptyAddBtn.addEventListener('click', function() {
                // Store current view state
                previousViewBeforeAdd = isWishlistViewActive ? 'wishlist' : 'library';
                isAddingBook = true;
                addBookCancelled = false;
                showIsbnInputModal();
            });
        }
        return;
    }

    // Update book count display
    const bookCount = displayBooks.length;
    const pluralSuffix = bookCount === 1 ? "book" : "books"; // Suffix includes "book(s)"
    bookCountDisplayElement.textContent = `${bookCount} ${pluralSuffix}`; // Simplified message

    // Select view type
    let viewClassName;
        if (currentView === 'grid') {
        viewClassName = 'grid-view';
    } else if (currentView === 'list') {
        viewClassName = 'list-view';
    } else {
        viewClassName = 'covers-view';
    }
    
    // Helper function to get status badge HTML
    function getStatusBadgeHTML(status) {
        if (!status) return '';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        return `<span class="status-badge status-${statusClass}">${status}</span>`;
    }

    // Generate HTML based on view type
    let booksHTML = `<div class="${viewClassName}">`;
    
        if (currentView === 'grid') {
        // Grid View
        displayBooks.forEach(book => {
            booksHTML += `
                <div class="book-item" data-book-id="${book.id}">
                    <a href="#" class="book-cover-link" data-book-id="${book.id}">
                        <img src="${book.displayCoverUrl}" alt="Cover of ${book.title}" class="book-cover" onerror="this.src='placeholder-cover.png'">
                </a>
                <div class="book-info">
                        <div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.authors.join(', ')}</p>
                            <div class="status-and-rating">
                                ${getStatusBadgeHTML(book.status)}
                                ${book.status !== 'Wishlist' 
                                    ? (book.personalRating 
                                        ? `<div class="stars-rating-pill" data-book-id="${book.id}">${renderStars(book.personalRating)}</div>` 
                                        : `<button class="btn-rate-book" data-book-id="${book.id}">Rate Book</button>`)
                                    : `<button class="btn-add-to-bookshelf" data-book-id="${book.id}">Add to Library</button>`}
                            </div>
                            ${!book.personalRating ? `
                            <div class="static-star-rating">
                                ${renderStars(book.personalRating)}
                            </div>` : ''}
                        </div>
                    <div class="book-actions">
                            ${book.status === 'Wishlist' 
                                ? '' 
                                : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    } else if (currentView === 'list') {
        // List View
        displayBooks.forEach(book => {
            booksHTML += `
                <div class="book-item" data-book-id="${book.id}">
                    <img src="${book.displayCoverUrl}" alt="Cover of ${book.title}" class="book-cover-list" onerror="this.src='placeholder-cover.png'">
                <div class="book-details-list">
                    <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.authors.join(', ')}</p>
                        <div class="status-and-rating">
                            ${getStatusBadgeHTML(book.status)}
                            ${book.status !== 'Wishlist' 
                                ? (book.personalRating 
                                    ? `<div class="stars-rating-pill" data-book-id="${book.id}">${renderStars(book.personalRating)}</div>`
                                    : `<button class="btn-rate-book" data-book-id="${book.id}">Rate Book</button>`)
                                : ''}
                        </div>
                        ${!book.personalRating ? `
                        <div class="book-rating-list">
                            ${renderStars(book.personalRating)}
                        </div>` : ''}
                    </div>
                    <div class="wishlist-actions-list">
                        ${book.status === 'Wishlist' 
                            ? `<button class="btn-add-to-bookshelf" data-book-id="${book.id}"><span class="material-symbols-outlined">add</span></button>` 
                            : ''}
                    </div>
                </div>
            `;
        });
    } else {
        // Covers View - compact grid showing just covers
        displayBooks.forEach(book => {
            booksHTML += `
                <div class="book-item" data-book-id="${book.id}">
                    <a href="#" class="book-cover-link" data-book-id="${book.id}">
                        <img src="${book.displayCoverUrl}" alt="Cover of ${book.title}" class="book-cover" onerror="this.src='placeholder-cover.png'">
                        ${book.status === 'Wishlist' ? `<div class="covers-wishlist-badge"><span class="material-symbols-outlined">favorite</span></div>` : ''}
                        ${book.personalRating ? `<div class="covers-rating-badge">${book.personalRating.toFixed(1)}</div>` : ''}
                        ${(book.status !== 'Wishlist' && !book.personalRating) ? `<div class="covers-unrated-badge"><span class="material-symbols-outlined">star</span></div>` : ''}
                    </a>
                </div>
            `;
        });
    }
    
    booksHTML += '</div>';
    bookDisplayArea.innerHTML = booksHTML;
    
    // Add click event delegation for book items and action buttons
    bookDisplayArea.addEventListener('click', handleBookAreaClick);
}


// --- Delegated Click Handler for Book Items ---
function handleBookAreaClick(event) {
    // Prevent default for links
    if (event.target.tagName === 'A') {
        event.preventDefault();
    }

    // Find closest book item if any
    const bookItem = event.target.closest('.book-item');
    if (!bookItem) return;

    // Get the book ID (check both attribute formats for compatibility)
    const bookId = bookItem.getAttribute('data-book-id') || bookItem.getAttribute('data-id');
    if (!bookId) {
        console.error("Book item clicked but no book ID found");
        return;
    }

    // Handle covers view rating badge click (yellow badge)
    if (event.target.closest('.covers-rating-badge')) {
                openRatingModal(bookId, false);
        event.stopPropagation();
        return;
    }
    // Handle covers view unrated badge click (purple star)
    if (event.target.closest('.covers-unrated-badge')) {
        openRatingModal(bookId, true);
        event.stopPropagation();
        return;
    }

    // Handle rate button click
    if (event.target.closest('.btn-rate-book')) {
        openRatingModal(bookId, !allBooks.find(b => b.id === bookId)?.personalRating);
        return;
    }
    
    // Handle stars rating pill click - opens the rating modal for editing
    if (event.target.closest('.stars-rating-pill')) {
        openRatingModal(bookId, false); // false indicates this is not an initial rating
        return;
    }

    // Handle add to bookshelf button click
    if (event.target.closest('.btn-add-to-bookshelf')) {
            handleAddToBookshelfClick(bookId);
        return;
        }

    // If no specific element was clicked, show the book detail modal
    showBookDetailModal(bookId);
}

// --- Specific Action Handlers ---
function handleAddToBookshelfClick(bookId) {
    if (!bookId) {
        console.error("No book ID provided to handleAddToBookshelfClick");
        return;
    }

    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        console.error(`Book with ID ${bookId} not found`);
        return;
    }

    // Only wishlist items can be added to bookshelf
    if (book.status !== 'Wishlist') {
        console.error(`Book with ID ${bookId} is not in wishlist`);
        return;
    }

    // Store the original status so we can revert if cancelled
    book._originalStatus = book.status;

    // Show the add book form pre-populated with the book data
    book.status = 'Unfinished'; // Default status when adding to bookshelf
    showAddBookModal(true, `Add ${book.title} to Library`);
    currentlyEditingBookId = bookId;

    // Get the form and populate it
    const form = document.getElementById('add-book-form');
    if (!form) {
        console.error("Add book form not found");
        return;
    }

    // Set the title and author fields
    form.querySelector('#title').value = book.title;
    form.querySelector('#authors').value = book.authors.join(', ');
    
    // Set the isbn field if it exists
    if (book.isbn) {
        form.querySelector('#isbn').value = book.isbn;
    }

    // Set the status radio button to Unfinished
    const statusRadio = form.querySelector('input[name="status"][value="Unfinished"]');
    if (statusRadio) {
        statusRadio.checked = true;
    }

    // Populate other fields if they exist in the book object
    if (book.publisher) {
        form.querySelector('#publisher').value = book.publisher;
    }
    if (book.publicationYear) {
        form.querySelector('#publicationYear').value = book.publicationYear;
    }
    if (book.pageCount) {
        form.querySelector('#userPageCount').value = book.pageCount;
    }
    
    // Show the form cover preview if the book has a cover image
    const formCoverPreview = document.getElementById('form-cover-preview');
    if (formCoverPreview && book.displayCoverUrl) {
        formCoverPreview.src = book.displayCoverUrl;
        formCoverPreview.style.display = 'block';
    }
    
    // Validate the form to enable the save button
    validateFormAndToggleButtonState(false);
}


// --- Modal Handling Functions ---
// Function to show modal and hide bottom nav
function showModal(modalElement) {
    if (!modalElement) return;
    
    // Add visible class to the modal
    modalElement.classList.add('visible');
    
    // Hide bottom navigation when modal is visible
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.visibility = 'hidden';
        bottomNav.style.opacity = '0';
        bottomNav.style.zIndex = '-1';
    }
}

// Function to hide modal and restore bottom nav if no other modals are visible
function hideModal(modalElement) {
    if (!modalElement) return;
    
    // Remove visible class from the modal
    modalElement.classList.remove('visible');
    
    // Check if any other modals are visible
    const visibleModals = document.querySelectorAll('.modal-container.visible');
    if (visibleModals.length === 0) {
        // No visible modals, restore bottom navigation
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.visibility = '';
            bottomNav.style.opacity = '';
            bottomNav.style.zIndex = '';
        }
    }
}

function clearFilters() {
    console.log("Clearing all filters");
    // Reset filter state
    activeFilters = {
        status: [],
        reader: [],
        targetRating: 0
    };
    isFilterActive = false;
    
    // Update button highlights directly
    const homeBtn = document.getElementById('home-nav-btn');
    const wishlistBtn = document.getElementById('wishlist-nav-btn');
    const searchBtn = document.getElementById('search-nav-btn');
    const filterBtn = document.getElementById('filter-nav-btn');
    
    // Remove active class from filter button
    if (filterBtn) filterBtn.classList.remove('active');
    
    // Set the correct view button
    if (isSearchActive && searchBtn) {
        searchBtn.classList.add('active');
    } else if (isWishlistViewActive && wishlistBtn) {
        wishlistBtn.classList.add('active');
    } else if (homeBtn) {
        homeBtn.classList.add('active');
    }
    
    renderBooks();
}

function showIsbnInputModal() {
    if (isbnInputContainer) {
        console.log("[showIsbnInputModal] Showing ISBN modal. Clearing fetched data."); // Log function call
        currentlyFetchedApiData = null;
        if (isbnManualInput) isbnManualInput.value = '';
        if (lookupStatusElement) lookupStatusElement.textContent = 'Type or dictate the ISBN, then click Lookup.';
        showModal(isbnInputContainer);
        if (isbnManualInput) isbnManualInput.focus();
    }
}

function hideIsbnInputModal() { 
    console.log("[hideIsbnInputModal] Hiding ISBN modal.");
    if (isbnInputContainer) { 
        hideModal(isbnInputContainer);
    }

    // Restore previous view state
    isAddingBook = false; // Crucial to do this before setting other views

    if (previousViewBeforeAdd === 'search') {
        isSearchActive = true;
        isLibraryViewActive = false;
        isWishlistViewActive = false;
        console.log("[hideIsbnInputModal] Restoring to Search view. currentSearchTerm:", currentSearchTerm);
    } else if (previousViewBeforeAdd === 'wishlist') {
        isWishlistViewActive = true;
        isLibraryViewActive = false;
        isSearchActive = false;
        console.log("[hideIsbnInputModal] Restoring to Wishlist view.");
    } else { // 'library' or default (e.g. if previousViewBeforeAdd was 'library' via viewBeforeFilter)
        isLibraryViewActive = true;
        isSearchActive = false;
        isWishlistViewActive = false;
        console.log("[hideIsbnInputModal] Restoring to Library view (default or determined by previousViewBeforeAdd).");
    }
    // previousViewBeforeAdd = null; // Optional: reset to avoid unintended carry-over if desired.

    setActiveNavButtons();
    renderBooks(); // Re-render books for the restored view
    console.log("[hideIsbnInputModal] View restored, nav buttons updated, books rendered.");
}

function showAddBookModal(skipReset = false, title = "Add New Book") {
    if (!addBookFormContainer || !addBookFormTitle || !addBookForm || !saveBookBtn) {
        console.error("One or more add book modal elements not found!");
        return;
    }
    
    isAddingBook = true;
    addBookCancelled = false;
    
    const userCoverUrlInputElement = document.getElementById('userCoverImageUrl');

    if (!skipReset) {
        console.log("[showAddBookModal] Resetting form for new book or cancelled edit.");
        currentlyFetchedApiData = null;
        currentlyEditingBookId = null; 
        currentUserCoverUrl = null; 
        customCoverRemoved = false; // Reset this flag
        if (addBookForm) addBookForm.reset(); // Resets all fields

        if (userCoverUrlInputElement) userCoverUrlInputElement.value = ''; // Explicitly clear URL input

        if(formCoverPreview) {
             formCoverPreview.src = 'placeholder-cover.png'; 
             formCoverPreview.style.display = 'none'; 
             formCoverPreview.classList.remove('custom-cover', 'api-cover');
             formCoverPreview.classList.add('placeholder');
        }
        if (removeCustomCoverBtn) {
             removeCustomCoverBtn.style.display = 'none';
             removeCustomCoverBtn.disabled = true;
        }
        
        const synopsisDisplay = addBookForm.querySelector('.synopsis-display-area');
        const synopsisInput = addBookForm.querySelector('#synopsis-edit-input');
        const displayArea = addBookForm.querySelector('.synopsis-display-area');
        if(displayArea) displayArea.style.display = '';
        if(synopsisInput) synopsisInput.style.display = 'none';
        const synopsisDisplayText = addBookForm.querySelector('#synopsis-display-text');
        if (synopsisDisplayText) synopsisDisplayText.textContent = '';
        if (apiGenresDisplay) apiGenresDisplay.innerHTML = '';

    } else {
        console.log("[showAddBookModal] Skipping reset (edit or prefill).");
    }

    if (addBookFormTitle) { addBookFormTitle.textContent = title; }
    populateSeriesDatalist();
    showModal(addBookFormContainer);
    validateFormAndToggleButtonState(false); 
}

function prefillAndShowAddBookForm(apiData) {
    if (!addBookForm || !formCoverPreview || !apiGenresDisplay || !removeCustomCoverBtn) {
        console.error("Required elements for prefilling not found.");
        return;
    }
    console.log("[Prefill] Starting prefill with data:", apiData);

    addBookForm.reset(); 
    currentlyFetchedApiData = apiData; 
    currentUserCoverUrl = null; 
    customCoverRemoved = false;
    
    const userCoverUrlInputElement = document.getElementById('userCoverImageUrl');
    if (userCoverUrlInputElement) userCoverUrlInputElement.value = '';

    apiGenresDisplay.innerHTML = ''; 
    removeCustomCoverBtn.style.display = 'none';
    removeCustomCoverBtn.disabled = true;

    if (apiData.coverImageUrl) {
        formCoverPreview.src = apiData.coverImageUrl;
        formCoverPreview.onerror = () => { 
            formCoverPreview.src = 'placeholder-cover.png'; 
            formCoverPreview.style.display = 'none';
            formCoverPreview.classList.remove('api-cover', 'custom-cover');
            formCoverPreview.classList.add('placeholder');
        };
        formCoverPreview.style.display = 'block'; 
        formCoverPreview.classList.add('api-cover');
        formCoverPreview.classList.remove('custom-cover', 'placeholder');
        console.log(`[Prefill] Set cover preview src to API cover: ${apiData.coverImageUrl}`);
    } else {
        formCoverPreview.src = 'placeholder-cover.png'; 
        formCoverPreview.style.display = 'none';
        formCoverPreview.classList.add('placeholder');
        formCoverPreview.classList.remove('custom-cover', 'api-cover');
        console.log("[Prefill] No API cover image URL found, using placeholder (hidden).");
    }
    const setVal = (selector, value) => { const el = addBookForm.querySelector(selector); if (el) el.value = value ?? ''; };
    setVal('#title', apiData.title);
    setVal('#authors', apiData.authors ? apiData.authors.join(', ') : '');
    const synopsisValue = apiData.synopsis || '';
    const synopsisTextArea = addBookForm.querySelector('#synopsis-edit-input');
    const synopsisDisplayP = addBookForm.querySelector('#synopsis-display-text');
    const synopsisDisplayArea = addBookForm.querySelector('.synopsis-display-area');
    if (synopsisTextArea) { synopsisTextArea.value = synopsisValue; synopsisTextArea.style.display = 'none'; }
    if (synopsisDisplayP) { synopsisDisplayP.textContent = synopsisValue || '(Synopsis not available)'; }
    if (synopsisDisplayArea) { synopsisDisplayArea.style.display = 'block'; }
    setVal('#publisher', apiData.publisher);
    setVal('#publicationYear', apiData.publicationYear);
    setVal('#userPageCount', apiData.pageCount);
    setVal('#isbn', apiData.isbn);
    
    if (apiData.apiGenres && apiData.apiGenres.length > 0) {
        apiGenresDisplay.innerHTML = `<strong>API Genres:</strong> ${apiData.apiGenres.join(', ')}`;
    } else {
         apiGenresDisplay.innerHTML = '';
    }

    // Prefill series title and number if they were auto-detected or from API data
    setVal('#userSeriesTitle', apiData.apiSeriesTitle || ''); 
    setVal('#userSeriesNumber', apiData.apiSeriesNumber || '');

    if (!addBookForm.querySelector('input[name="status"]:checked')) {
        const toReadRadio = addBookForm.querySelector('input[name="status"][value="Unfinished"]');
        if (toReadRadio) toReadRadio.checked = true;
    }

    showAddBookModal(true, "Confirm / Add Book Details");
    validateFormAndToggleButtonState(false); 
    console.log("[Prefill] Prefill complete, modal shown.");
}

function startEditBook(bookId) {
    const bookToEdit = allBooks.find(b => b.id === bookId);
    if (!bookToEdit) { console.error(`Edit Error: Book ${bookId} not found.`); alert("Error: Book not found."); return; }
    
    console.log(`[startEditBook] Editing book: ${bookToEdit.title}`);
    currentlyEditingBookId = bookId;
    currentlyFetchedApiData = null; 
    customCoverRemoved = false; 
    
    if (!addBookForm) { console.error("[startEditBook] Add book form not found!"); return; }
    addBookForm.reset(); 

    const userCoverUrlInputElement = document.getElementById('userCoverImageUrl');
    const setVal = (selector, value) => { const el = addBookForm.querySelector(selector); if (el) el.value = value ?? ''; };
    
    setVal('#title', bookToEdit.title);
    setVal('#authors', bookToEdit.authors.join(', '));
    setVal('#isbn', bookToEdit.isbn);
    setVal('#publicationYear', bookToEdit.publicationYear);
    setVal('#publisher', bookToEdit.publisher);
    const synopsisValue = bookToEdit.synopsis || '';
    const synopsisTextArea = addBookForm.querySelector('#synopsis-edit-input');
    const synopsisDisplayP = addBookForm.querySelector('#synopsis-display-text');
    const synopsisDisplayArea = addBookForm.querySelector('.synopsis-display-area');
    if (synopsisDisplayP) synopsisDisplayP.textContent = synopsisValue;
    if (synopsisTextArea) {synopsisTextArea.value = synopsisValue; synopsisTextArea.style.display = 'none';}
    if (synopsisDisplayArea) synopsisDisplayArea.style.display = 'block';
    const readerRadio = addBookForm.querySelector(`input[name="reader"][value="${bookToEdit.reader}"]`);
    if (readerRadio) readerRadio.checked = true;
    const statusRadio = addBookForm.querySelector(`input[name="status"][value="${bookToEdit.status}"]`);
    if (statusRadio) statusRadio.checked = true;
    setVal('#dateFinished', bookToEdit.dateFinished);
    setVal('#tags', bookToEdit.customTags.join(', '));
    
    // Populate series from saved book data when editing
    setVal('#userSeriesTitle', bookToEdit.userSeriesTitle || ''); 
    setVal('#userSeriesNumber', bookToEdit.userSeriesNumber || '');
    
    setVal('#userPageCount', bookToEdit.userPageCount);

    if (formCoverPreview && userCoverUrlInputElement && removeCustomCoverBtn) {
        formCoverPreview.classList.remove('custom-cover', 'api-cover', 'placeholder');
        if (bookToEdit.userCoverImageUrl) {
            userCoverUrlInputElement.value = bookToEdit.userCoverImageUrl;
            currentUserCoverUrl = bookToEdit.userCoverImageUrl;
            formCoverPreview.src = bookToEdit.userCoverImageUrl;
            formCoverPreview.style.display = 'block';
            formCoverPreview.classList.add('custom-cover');
            removeCustomCoverBtn.style.display = 'inline-block';
            removeCustomCoverBtn.disabled = false;
        } else if (bookToEdit.coverImageUrl) {
            userCoverUrlInputElement.value = '';
            currentUserCoverUrl = null;
            formCoverPreview.src = bookToEdit.coverImageUrl;
            formCoverPreview.style.display = 'block';
            formCoverPreview.classList.add('api-cover');
            removeCustomCoverBtn.style.display = 'inline-block'; 
            removeCustomCoverBtn.disabled = false;
        } else {
            userCoverUrlInputElement.value = '';
            currentUserCoverUrl = null;
            formCoverPreview.src = 'placeholder-cover.png';
            formCoverPreview.style.display = 'none';
            formCoverPreview.classList.add('placeholder');
            removeCustomCoverBtn.style.display = 'none';
            removeCustomCoverBtn.disabled = true;
        }
        formCoverPreview.onerror = () => { 
            formCoverPreview.src = 'placeholder-cover.png'; 
            formCoverPreview.style.display = 'none'; 
            formCoverPreview.classList.remove('custom-cover', 'api-cover'); 
            formCoverPreview.classList.add('placeholder');
            if (userCoverUrlInputElement) userCoverUrlInputElement.value = ''; 
            currentUserCoverUrl = null;
            removeCustomCoverBtn.style.display = 'none'; 
        };
    }
    
    if (apiGenresDisplay && bookToEdit.apiGenres && bookToEdit.apiGenres.length > 0) {
        apiGenresDisplay.innerHTML = `<strong>API Genres:</strong> ${bookToEdit.apiGenres.join(', ')}`;
    } else if (apiGenresDisplay) {
        apiGenresDisplay.innerHTML = '';
    }

    hideBookDetailModal();
    showAddBookModal(true, "Edit Book Details");
    validateFormAndToggleButtonState(false);
}

function handleAddBookSubmit(event) {
    event.preventDefault();
    console.log("[handleAddBookSubmit] Form submission initiated by user.");
    
    const userCoverUrlInputElement = document.getElementById('userCoverImageUrl');
    let isFormCompletelyValid = addBookForm.checkValidity();

    if (userCoverUrlInputElement && !userCoverUrlInputElement.checkValidity()) {
        // This checks if the URL, if provided, is a valid URL format.
        // It does not check if the field is empty, as it's not required.
        isFormCompletelyValid = false; 
    }

    if (!isFormCompletelyValid) {
        addBookForm.reportValidity(); 
        if (userCoverUrlInputElement && !userCoverUrlInputElement.checkValidity()) {
            console.warn("[handleAddBookSubmit] Custom Cover URL input has an invalid URL format.");
        }
        console.warn("[handleAddBookSubmit] Form is invalid. Submission halted.");
        validateFormAndToggleButtonState(true); // Re-validate and ensure button state reflects submit attempt
        return;
    }
    console.log("[handleAddBookSubmit] Form is valid. Proceeding with data extraction.");
    
    const formData = new FormData(addBookForm);
    const getValue = (key, defaultValue = '') => formData.get(key) || defaultValue;
    const getNumberValue = (key, defaultValue = null) => { 
        const val = formData.get(key); 
        return (val !== null && val !== '' && !isNaN(val)) ? parseFloat(val) : defaultValue; 
    };
    const getArrayValue = (inputId) => { 
        const el = addBookForm.querySelector(`#${inputId}`); 
        return el && el.value ? el.value.split(',').map(s => s.trim()).filter(Boolean) : []; 
    };
    
    const title = getValue('title');
    const authorsString = getValue('authors');
    const isbn = getValue('isbn');
    const publisher = getValue('publisher');
    const publicationYear = getValue('publicationYear');
    const status = getValue('status');
    const reader = getValue('reader');
    const userPageCount = getNumberValue('userPageCount');
    const dateFinished = getValue('dateFinished') || null;
    const userSeriesTitle = getValue('userSeriesTitle');
    const userSeriesNumber = getValue('userSeriesNumber');
    const tagsArray = getArrayValue('tags');
    const synopsis = getValue('synopsis');
    const authors = authorsString.split(',').map(author => author.trim()).filter(Boolean);

    console.log(`[handleAddBookSubmit] Extracted Data - Title: ${title}, Authors: ${authors.join(', ')}, Status: ${status}, Reader: ${reader}`);
    
    // The native 'required' attribute should prevent empty title/authors if form is valid.
    // This check is an extra safeguard, but if it triggers, it indicates a problem with checkValidity().
    if (title.trim() === '' || authors.length === 0) {
        console.error("[handleAddBookSubmit] CRITICAL: Title or Authors are empty despite passing form validation. This should not happen with 'required' fields.");
        alert('Error: Title and Author are required. Please ensure they are filled (Error S2).');
        validateFormAndToggleButtonState(true);
        return;
    }
    
    let finalUserCoverUrl = null;
    const currentCustomUrlFromInput = userCoverUrlInputElement ? userCoverUrlInputElement.value.trim() : null;

    if (customCoverRemoved) {
        finalUserCoverUrl = null; 
        console.log("[handleAddBookSubmit] Custom cover was explicitly removed by user (customCoverRemoved=true).");
    } else if (currentCustomUrlFromInput) {
        finalUserCoverUrl = currentCustomUrlFromInput; 
        console.log(`[handleAddBookSubmit] Using custom cover URL from input: ${finalUserCoverUrl}`);
    } else if (currentlyEditingBookId) {
        const originalBook = allBooks.find(book => book.id === currentlyEditingBookId);
        if (originalBook && originalBook.userCoverImageUrl) {
            // If editing, no new URL, and not removed, keep existing custom URL
            finalUserCoverUrl = originalBook.userCoverImageUrl; 
            console.log(`[handleAddBookSubmit] Editing: No new URL, not removed. Retaining original userCoverImageUrl: ${finalUserCoverUrl}`);
        } else {
            finalUserCoverUrl = null; // Editing, but no new URL, not removed, and no original custom URL.
            console.log("[handleAddBookSubmit] Editing: No new URL, not removed, and no pre-existing custom URL. finalUserCoverUrl is null.");
        }
    } else {
        // New book, input is empty, and customCoverRemoved is false.
        finalUserCoverUrl = null;
        console.log("[handleAddBookSubmit] New book: No custom cover URL provided. finalUserCoverUrl is null.");
    }
    console.log(`[handleAddBookSubmit] Final determined userCoverImageUrl for save: ${finalUserCoverUrl}`);

    let bookDataForSave = {
        title,
        authors,
        isbn, 
        publisher,
        publicationYear,
        status,
        reader,
        userPageCount, 
        userSeriesTitle,
        userSeriesNumber,
        customTags: tagsArray,
        synopsis,
        dateFinished: (status === 'Finished' && dateFinished) ? dateFinished : null,
    };
    console.log("[handleAddBookSubmit] Constructed bookDataForSave object:", JSON.stringify(bookDataForSave).substring(0, 200) + '...');
    
    if (currentlyEditingBookId) {
        console.log(`[handleAddBookSubmit] Attempting to update existing book with ID: ${currentlyEditingBookId}`);
        const existingBookIndex = allBooks.findIndex(book => book.id === currentlyEditingBookId);
        if (existingBookIndex !== -1) {
            const originalBook = allBooks[existingBookIndex];
            console.log("[handleAddBookSubmit] Original book data for edit:", JSON.stringify(originalBook).substring(0,200) + '...');
            const updatedBook = new BookV2(
                bookDataForSave.isbn || originalBook.isbn, 
                bookDataForSave.title,
                bookDataForSave.authors,
                originalBook.coverImageUrl, 
                bookDataForSave.synopsis,
                bookDataForSave.publisher,
                bookDataForSave.publicationYear,
                originalBook.pageCount, 
                originalBook.apiGenres, 
                originalBook.apiSeriesTitle, 
                originalBook.apiSeriesNumber, 
                bookDataForSave.reader,
                bookDataForSave.status,
                originalBook.personalRating, 
                originalBook.dateAdded,       
                bookDataForSave.dateFinished,
                bookDataForSave.customTags,
                bookDataForSave.userSeriesTitle,
                bookDataForSave.userSeriesNumber,
                bookDataForSave.userPageCount, 
                finalUserCoverUrl, 
                originalBook.review
            );
            updatedBook.id = originalBook.id; 
            allBooks[existingBookIndex] = updatedBook;
            console.log(`[handleAddBookSubmit] Book ID ${currentlyEditingBookId} updated in allBooks array. New title: ${updatedBook.title}`);
        } else {
            console.error(`[handleAddBookSubmit] CRITICAL ERROR: Book with ID ${currentlyEditingBookId} not found in allBooks during update attempt.`);
            // Potentially alert user or handle more gracefully
            return; // Stop to prevent further issues
        }
    } else {
        console.log("[handleAddBookSubmit] Attempting to add a new book.");
        const newBook = new BookV2(
            bookDataForSave.isbn, 
            bookDataForSave.title,
            bookDataForSave.authors,
            currentlyFetchedApiData?.coverImageUrl || '', 
            bookDataForSave.synopsis,
            bookDataForSave.publisher,
            bookDataForSave.publicationYear,
            currentlyFetchedApiData?.pageCount || null, 
            currentlyFetchedApiData?.apiGenres || [],
            currentlyFetchedApiData?.apiSeriesTitle || '', 
            currentlyFetchedApiData?.apiSeriesNumber || '', 
            bookDataForSave.reader,
            bookDataForSave.status,
            null, 
            new Date().toISOString(), 
            bookDataForSave.dateFinished,
            bookDataForSave.customTags,
            bookDataForSave.userSeriesTitle,
            bookDataForSave.userSeriesNumber,
            bookDataForSave.userPageCount, 
            finalUserCoverUrl, 
            '' 
        );
        allBooks.push(newBook);
        console.log(`[handleAddBookSubmit] New book "${newBook.title}" added to allBooks array. Assigned ID: ${newBook.id}`);
    }
    
    console.log("[handleAddBookSubmit] Attempting to save allBooks array to local storage.");
    saveBooksToStorage(allBooks);
    console.log("[handleAddBookSubmit] allBooks array successfully saved to local storage.");

    if (bookDataForSave.userSeriesTitle && bookDataForSave.userSeriesTitle.trim()) {
        const currentSeriesTitles = loadSeriesTitles();
        if (!currentSeriesTitles.includes(bookDataForSave.userSeriesTitle.trim())) {
            saveSeriesTitles([...currentSeriesTitles, bookDataForSave.userSeriesTitle.trim()]);
            console.log(`[handleAddBookSubmit] New series title "${bookDataForSave.userSeriesTitle.trim()}" added and saved.`);
        }
    }
    
    if (status === 'Wishlist') {
        isWishlistViewActive = true;
        console.log("[handleAddBookSubmit] Book status is Wishlist, setting isWishlistViewActive to true.");
    } else {
        isWishlistViewActive = false;
        // If moving from wishlist to another status during edit, ensure wishlist view isn't stuck
    }
    
    if (isSearchActive) {
        clearSearch(); // Clear search to show all books or updated book in its new state
        console.log("[handleAddBookSubmit] Search was active, clearing search results.");
    }
    if (isFilterActive) {
        clearFilters(); 
        console.log("[handleAddBookSubmit] Filters were active, clearing filters.");
    }
    
    // Reset global state flags related to the add/edit process
    addBookCancelled = false;
    isAddingBook = false;
    currentlyEditingBookId = null;
    currentlyFetchedApiData = null; 
    customCoverRemoved = false; 
    console.log("[handleAddBookSubmit] Global add/edit state flags reset.");
    
    console.log("[handleAddBookSubmit] Calling hideAddBookModal() to close the form.");
    hideAddBookModal();
    
    console.log("[handleAddBookSubmit] Calling setActiveNavButtons() and renderBooks() to refresh UI.");
    setActiveNavButtons();
    renderBooks();
    console.log("[handleAddBookSubmit] Form submission process complete.");
}

// --- Document Ready --- //
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("[DOMContentLoaded] Starting setup...");

        const searchNavBtn = document.getElementById('search-nav-btn');
        const homeNavBtn = document.getElementById('home-nav-btn');
        const addNavBtn = document.getElementById('add-nav-btn'); // Initial declaration
        const wishlistNavBtn = document.getElementById('wishlist-nav-btn'); // Initial declaration
        const filterNavBtn = document.getElementById('filter-nav-btn'); // Initial declaration

        // Initialize other UI Element Variables
        bookDisplayArea = document.getElementById('book-display-area');
        bookCountDisplayElement = document.getElementById('book-count-display');
        isbnInputContainer = document.getElementById('isbn-input-container');
        isbnManualInput = document.getElementById('isbn-manual-input');
        isbnLookupButton = document.getElementById('isbn-lookup-btn');
        cancelIsbnInputButton = document.getElementById('cancel-isbn-input-btn');
        seriesTitlesDatalist = document.getElementById('series-titles-list');
        addBookFormContainer = document.getElementById('add-book-form-container');
        addBookForm = document.getElementById('add-book-form');
        cancelAddBookButton = document.getElementById('cancel-add-book-btn');
        addBookFormTitle = document.getElementById('add-book-form-title');
        resetDataButton = document.getElementById('reset-data-btn');
        bookDetailModal = document.getElementById('book-detail-modal');
        detailCover = document.getElementById('detail-cover');
        detailTitle = document.getElementById('detail-title');
        detailAuthor = document.getElementById('detail-author');
        detailSeries = document.getElementById('detail-series');
        detailRating = document.getElementById('detail-rating');
        detailStatus = document.getElementById('detail-status');
        detailReader = document.getElementById('detail-reader');
        detailDateAdded = document.getElementById('detail-date-added');
        detailDateFinished = document.getElementById('detail-date-finished');
        detailTags = document.getElementById('detail-tags');
        detailSynopsis = document.getElementById('detail-synopsis');
        detailPageCount = document.getElementById('detail-page-count');
        detailPublisher = document.getElementById('detail-publisher');
        detailPublicationYear = document.getElementById('detail-publication-year');
        detailIsbn = document.getElementById('detail-isbn');
        editBookBtn = document.getElementById('edit-book-btn');
        closeDetailBtn = document.getElementById('close-detail-btn');
        formCoverPreview = document.getElementById('form-cover-preview');
        apiGenresDisplay = document.getElementById('api-genres-display');
        saveBookBtn = document.getElementById('save-book-btn');
        removeCustomCoverBtn = document.getElementById('remove-custom-cover-btn');
        settingsModal = document.getElementById('settings-modal');
        console.log("[DOMContentLoaded] settingsModal element:", settingsModal); // DIAGNOSTIC
        addManuallyBtn = document.getElementById('add-manually-btn');
        deleteBookBtn = document.getElementById('delete-book-btn');
        editSynopsisBtn = document.getElementById('edit-synopsis-btn');
        userCoverImageUrlelement = document.getElementById('userCoverImageUrl');

        // Rating Modal UI Elements Initialization
        ratingReviewModal = document.getElementById('rating-review-modal');
        interactiveStarsContainer = document.getElementById('interactive-stars');
        ratingValueDisplay = document.getElementById('rating-value-display');
        reviewInput = document.getElementById('review-input');
        ratingModalTitle = document.getElementById('rating-modal-title');
        ratingSaveBtn = document.getElementById('rating-save-btn');
        ratingCancelBtn = document.getElementById('rating-cancel-btn');
        ratingCloseBtn = document.getElementById('rating-close-btn');

        const userSeriesTitleInput = addBookForm ? addBookForm.querySelector('#userSeriesTitle') : null;
        const userSeriesNumberInput = addBookForm ? addBookForm.querySelector('#userSeriesNumber') : null;
        const bookTitleInput = addBookForm ? addBookForm.querySelector('#title') : null;

        if (userSeriesTitleInput && userSeriesNumberInput && bookTitleInput) {
            userSeriesTitleInput.addEventListener('blur', function() {
                const currentSeriesTitle = this.value.trim();
                const currentBookTitle = bookTitleInput.value.trim();
                const currentSeriesNumber = userSeriesNumberInput.value.trim();
                if (currentSeriesTitle && currentBookTitle && currentSeriesNumber === '') {
                    const detectedNumber = extractSeriesNumberAfterTitle(currentBookTitle, currentSeriesTitle);
                    if (detectedNumber) {
                        userSeriesNumberInput.value = detectedNumber;
                    }
                }
            });
        }

        updateDarkModeUI();
        setView(currentView);

        if (searchNavBtn) {
            searchNavBtn.onclick = function() {
                if (isSearchActive) {
                    clearSearch();
                } else {
                    showSearchModal();
                }
                setTimeout(fixNavigationButtons, 50);
                return false;
            };
        }

        // Use already declared wishlistNavBtn
        if (wishlistNavBtn) {
            wishlistNavBtn.onclick = function() {
                if (isSearchActive) {
                    clearSearch();
                }
                isWishlistViewActive = true;
                setActiveNavButtons();
                renderBooks();
                return false;
            };
        }

        // Use already declared filterNavBtn
        if (filterNavBtn) {
            filterNavBtn.onclick = function() {
                if (isSearchActive) {
                    viewBeforeFilter = 'search';
                } else if (isWishlistViewActive) {
                    viewBeforeFilter = 'wishlist';
                } else {
                    viewBeforeFilter = 'library';
                }
                showFilterModal();
                return false;
            };
        }

        function fixNavigationButtons() {
            const navButtons = document.querySelectorAll('.bottom-nav-button');
            navButtons.forEach(btn => {
                if (btn.id === 'search-nav-btn') {
                    if (!isSearchActive && !btn.innerHTML.includes("Search")) { // Simplified condition
                         btn.innerHTML = '<span class="material-symbols-outlined">search</span><span>Search</span>';
                    } else if (isSearchActive && (!btn.innerHTML.includes("Search") || !btn.innerHTML.includes("close"))) { // Check if it needs update to X icon + Search text
                         btn.innerHTML = '<span class="material-symbols-outlined">close</span><span>Search</span>'; // Changed from Clear Search
                    }
                    // Force styles for search button (already present, kept for reference)
                    btn.style.cssText = `height: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; cursor: pointer !important; visibility: visible !important; opacity: 1 !important;`;
                    const icon = btn.querySelector('.material-symbols-outlined');
                    const text = btn.querySelector('span:not(.material-symbols-outlined)');
                    if (icon) icon.style.cssText = `display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 1.5rem !important; margin-bottom: 0.3rem !important; position: relative !important; z-index: 5 !important;`;
                    if (text) text.style.cssText = `display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 0.7rem !important; position: relative !important; z-index: 5 !important;`;
                    return;
                }
                const icon = btn.querySelector('.material-symbols-outlined');
                const text = btn.querySelector('span:not(.material-symbols-outlined)');
                btn.style.cssText = `height: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; cursor: pointer !important; visibility: visible !important; opacity: 1 !important;`;
                if (icon) {
                    icon.style.cssText = `display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 1.5rem !important; margin-bottom: 0.3rem !important; position: relative !important; z-index: 5 !important;`;
                    icon.classList.remove('hidden');
                    let parent = icon.parentElement;
                    while (parent && parent !== document.body) {
                        if (window.getComputedStyle(parent).display === 'none') parent.style.display = 'block !important';
                        if (window.getComputedStyle(parent).visibility === 'hidden') parent.style.visibility = 'visible !important';
                        if (window.getComputedStyle(parent).opacity === '0') parent.style.opacity = '1 !important';
                        parent = parent.parentElement;
                    }
                }
                if (text) {
                    text.style.cssText = `display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 0.7rem !important; position: relative !important; z-index: 5 !important;`;
                    text.classList.remove('hidden');
                }
            });
        }

        if (homeNavBtn) {
            homeNavBtn.onclick = function() {
                isWishlistViewActive = false;
                isAddingBook = false;
                if (isSearchActive) {
                    clearSearch();
                } else if (isFilterActive) {
                    clearFilters();
                } else {
                    renderBooks();
                    setActiveNavButtons();
                }
                return false;
            };
        }

        // Use already declared addNavBtn
        if (addNavBtn) {
            addNavBtn.onclick = function() {
                console.log("[addNavBtn.onclick] Clicked. Current states: isSearchActive=", isSearchActive, "isFilterActive=", isFilterActive, "isWishlistViewActive=", isWishlistViewActive, "viewBeforeFilter=", viewBeforeFilter);
                if (isFilterActive) {
                    // If filter is active, previous view is what was stored in viewBeforeFilter
                    previousViewBeforeAdd = viewBeforeFilter; 
                } else if (isSearchActive) {
                    previousViewBeforeAdd = 'search';
                } else if (isWishlistViewActive) {
                    previousViewBeforeAdd = 'wishlist';
                } else {
                    previousViewBeforeAdd = 'library'; // Default to library
                }
                console.log("[addNavBtn.onclick] previousViewBeforeAdd determined as:", previousViewBeforeAdd);

                isAddingBook = true;
                addBookCancelled = false; 

                // Deactivate other primary views as 'Add' mode is now active
                isLibraryViewActive = false;
                isSearchActive = false;
                isWishlistViewActive = false;
                // isFilterActive remains as is. If user cancels 'Add', they return to the previous view,
                // and if it was filtered, it should remain filtered. setActiveNavButtons will handle filter button highlight.
                
                console.log("[addNavBtn.onclick] Set isAddingBook=true. Clearing other primary view flags.");

                showIsbnInputModal();
                setActiveNavButtons(); // This will correctly highlight 'Add'
                return false;
            };
        }

        if (wishlistNavBtn) {
            const oldWishlistClick = wishlistNavBtn.onclick; // This is fine, oldWishlistClick is a new variable
            wishlistNavBtn.onclick = function() {
                setTimeout(fixNavigationButtons, 50);
                return oldWishlistClick ? oldWishlistClick.apply(this, arguments) : true;
            };
        }

        if (filterNavBtn) {
            const oldFilterClick = filterNavBtn.onclick; // This is fine
            filterNavBtn.onclick = function() {
                setTimeout(fixNavigationButtons, 50);
                return oldFilterClick ? oldFilterClick.apply(this, arguments) : true;
            };
        }
        // The searchNavBtn.onclick is now defined earlier and includes the fixNavigationButtons timeout call.

        setInterval(fixNavigationButtons, 2000);
        allBooks = loadBooksFromStorage();
        populateSeriesDatalist();
        renderBooks();

        if (addBookForm) {
            addBookForm.addEventListener('submit', handleAddBookSubmit);
            ['title', 'authors', 'userCoverImageUrl'].forEach(id => {
                const inputElement = addBookForm.querySelector(`#${id}`);
                if (inputElement) inputElement.addEventListener('input', () => validateFormAndToggleButtonState(false));
            });
            ['reader', 'status'].forEach(name => {
                const radioGroup = addBookForm.querySelectorAll(`input[name="${name}"]`);
                radioGroup.forEach(radio => radio.addEventListener('change', () => validateFormAndToggleButtonState(false)));
            });
            if (saveBookBtn) {
                saveBookBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    const isFormValid = validateFormAndToggleButtonState(true);
                    if (isFormValid) {
                        handleAddBookSubmit(event);
                    } else {
                        console.warn("[Save Button Click] Form is invalid. Submission blocked.");
                    }
                });
            }
            validateFormAndToggleButtonState(false);
        }

        if (cancelAddBookButton) {
            cancelAddBookButton.addEventListener('click', function() {
                const bookBeingEditedId = currentlyEditingBookId;
                addBookCancelled = true;
                // isAddingBook = false; // No longer needed here, hideAddBookModal handles this
                // currentlyEditingBookId = null; // hideAddBookModal resets this
                // currentlyFetchedApiData = null; // hideAddBookModal resets this
                
                hideAddBookModal(); // This function now correctly handles view restoration and UI updates

                // The following logic for view restoration is now handled by hideAddBookModal
                // if (previousViewBeforeAdd === 'wishlist') isWishlistViewActive = true;
                // else if (!isSearchActive && !isFilterActive) isWishlistViewActive = false;
                // setActiveNavButtons();
                // renderBooks();

                // Logic for reverting status if a wishlist item edit was cancelled
                if (bookBeingEditedId) {
                    const editedBook = allBooks.find(b => b.id === bookBeingEditedId);
                    // Check if the book was originally from wishlist and its status was changed during edit process but then cancelled.
                    if (editedBook && editedBook._originalStatus === 'Wishlist' && editedBook.status !== 'Wishlist') {
                        editedBook.status = 'Wishlist'; // Revert to Wishlist
                        delete editedBook._originalStatus; // Clean up temporary flag
                        saveBooksToStorage(allBooks); // Save the change
                        console.log(`[CancelAddBook] Reverted status to Wishlist for book ID: ${bookBeingEditedId}`);
                        // renderBooks() is called by hideAddBookModal, so UI should refresh.
                    }
                }
            });
        }

        if (closeDetailBtn) closeDetailBtn.addEventListener('click', hideBookDetailModal);
        if (editBookBtn) editBookBtn.addEventListener('click', () => detailModalBookId && startEditBook(detailModalBookId));
        if (deleteBookBtn) deleteBookBtn.addEventListener('click', () => detailModalBookId && handleDeleteBook(detailModalBookId));

        if (resetDataButton) {
            const resetConfirmModal = document.getElementById('reset-confirm-modal');
            const resetConfirmOkBtn = document.getElementById('reset-confirm-ok-btn');
            const resetConfirmCancelBtn = document.getElementById('reset-confirm-cancel-btn');
            resetDataButton.onclick = () => resetConfirmModal && showModal(resetConfirmModal);
            if (resetConfirmOkBtn) resetConfirmOkBtn.onclick = () => { hideModal(resetConfirmModal); resetAllData(); };
            if (resetConfirmCancelBtn) resetConfirmCancelBtn.onclick = () => hideModal(resetConfirmModal);
        }

        if (editSynopsisBtn) editSynopsisBtn.addEventListener('click', handleSynopsisEditClick);

        if (userCoverImageUrlelement && formCoverPreview && removeCustomCoverBtn) {
            userCoverImageUrlelement.addEventListener('input', function() {
                const newUrl = this.value.trim();
                currentUserCoverUrl = newUrl;
                if (newUrl) {
                    customCoverRemoved = false;
                    formCoverPreview.src = newUrl;
                    formCoverPreview.onerror = () => {
                        formCoverPreview.src = 'placeholder-cover.png';
                        formCoverPreview.classList.add('placeholder');
                        formCoverPreview.classList.remove('custom-cover', 'api-cover');
                        if (userCoverImageUrlelement) userCoverImageUrlelement.value = '';
                        currentUserCoverUrl = null;
                        const bookBeingEdited = currentlyEditingBookId ? allBooks.find(b => b.id === currentlyEditingBookId) : null;
                        const apiDataSource = bookBeingEdited || currentlyFetchedApiData;
                        if (apiDataSource && apiDataSource.coverImageUrl) {
                            formCoverPreview.src = apiDataSource.coverImageUrl;
                            formCoverPreview.classList.remove('placeholder');
                            formCoverPreview.classList.add('api-cover');
                            removeCustomCoverBtn.style.display = 'inline-block';
                            removeCustomCoverBtn.disabled = false;
                        } else {
                            formCoverPreview.style.display = 'none';
                            removeCustomCoverBtn.style.display = 'none';
                            removeCustomCoverBtn.disabled = true;
                        }
                    };
                    formCoverPreview.style.display = 'block';
                    formCoverPreview.classList.remove('placeholder', 'api-cover');
                    formCoverPreview.classList.add('custom-cover');
                    removeCustomCoverBtn.style.display = 'inline-block';
                    removeCustomCoverBtn.disabled = false;
                } else {
                    let fallbackSrc = 'placeholder-cover.png';
                    let isApiCover = false;
                    let showPreview = false;
                    const bookBeingEdited = currentlyEditingBookId ? allBooks.find(b => b.id === currentlyEditingBookId) : null;
                    const sourceData = bookBeingEdited || currentlyFetchedApiData;
                    if (sourceData && sourceData.coverImageUrl) {
                        fallbackSrc = sourceData.coverImageUrl;
                        isApiCover = true;
                        showPreview = true;
                    }
                    formCoverPreview.src = fallbackSrc;
                    formCoverPreview.classList.remove('custom-cover');
                    if (isApiCover) {
                        formCoverPreview.classList.add('api-cover');
                        formCoverPreview.classList.remove('placeholder');
                    } else {
                        formCoverPreview.classList.add('placeholder');
                        formCoverPreview.classList.remove('api-cover');
                    }
                    if (showPreview) {
                        formCoverPreview.style.display = 'block';
                        removeCustomCoverBtn.style.display = isApiCover ? 'inline-block' : 'none';
                        removeCustomCoverBtn.disabled = !isApiCover;
                    } else {
                        formCoverPreview.style.display = 'none';
                        removeCustomCoverBtn.style.display = 'none';
                        removeCustomCoverBtn.disabled = true;
                    }
                }
            });
        }

        if (removeCustomCoverBtn && userCoverImageUrlelement && formCoverPreview) {
            removeCustomCoverBtn.addEventListener('click', function() {
                customCoverRemoved = true;
                currentUserCoverUrl = null;
                userCoverImageUrlelement.value = '';
                let fallbackSrc = 'placeholder-cover.png';
                let isApiCover = false;
                let showPreview = false;
                const bookBeingEdited = currentlyEditingBookId ? allBooks.find(b => b.id === currentlyEditingBookId) : null;
                const sourceData = bookBeingEdited || currentlyFetchedApiData;
                if (sourceData && sourceData.coverImageUrl) {
                    fallbackSrc = sourceData.coverImageUrl;
                    isApiCover = true;
                    showPreview = true;
                }
                formCoverPreview.src = fallbackSrc;
                formCoverPreview.classList.remove('custom-cover');
                if (isApiCover) {
                    formCoverPreview.classList.add('api-cover');
                    formCoverPreview.classList.remove('placeholder');
                } else {
                    formCoverPreview.classList.add('placeholder');
                    formCoverPreview.classList.remove('api-cover');
                }
                if (showPreview) formCoverPreview.style.display = 'block';
                else formCoverPreview.style.display = 'none';
                this.style.display = 'none';
                this.disabled = true;
            });
        }

        const darkModeBtn = document.getElementById('dark-mode-btn');
        if (darkModeBtn) darkModeBtn.addEventListener('click', toggleDarkMode);

        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        const coversViewBtn = document.getElementById('covers-view-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsCloseBtn = document.getElementById('settings-close-btn');
        const searchSubmitBtn = document.getElementById('search-submit-btn');
        const searchCancelBtn = document.getElementById('search-cancel-btn');
        const filterApplyBtn = document.getElementById('filter-apply-btn');
        const filterClearBtn = document.getElementById('filter-clear-btn');
        const filterCancelBtn = document.getElementById('filter-cancel-btn');

        // Settings Modal Buttons - Placed earlier to ensure listeners are attached
        // const exportDataBtn = document.getElementById('export-data-btn');
        // console.log("[DOMContentLoaded] exportDataBtn element:", exportDataBtn); // DIAGNOSTIC
        // const importDataBtn = document.getElementById('import-data-btn');
        // console.log("[DOMContentLoaded] importDataBtn element:", importDataBtn); // DIAGNOSTIC
        // const csvFileInput = document.getElementById('csv-file-input');
        // console.log("[DOMContentLoaded] csvFileInput element:", csvFileInput); // DIAGNOSTIC

        // if (exportDataBtn) {
        //     console.log("[DOMContentLoaded] Attaching listener to exportDataBtn.");
        //     exportDataBtn.addEventListener('click', handleExportData);
        // } else {
        //     console.warn("[DOMContentLoaded] exportDataBtn not found, listener not attached.");
        // }
        // if (exportDataBtn) {
        // if (importDataBtn) {
        //     console.log("[DOMContentLoaded] Attaching listener to importDataBtn.");
        //     importDataBtn.addEventListener('click', handleImportDataTrigger);
        // } else {
        //     console.warn("[DOMContentLoaded] importDataBtn not found, listener not attached.");
        // }
        // if (csvFileInput) {
        //     console.log("[DOMContentLoaded] Attaching listener to csvFileInput.");
        //     csvFileInput.addEventListener('change', processImportedCsv);
        // } else {
        //     console.warn("[DOMContentLoaded] csvFileInput not found, listener not attached.");
        // }

        if (gridViewBtn) gridViewBtn.addEventListener('click', () => setView('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => setView('list'));
        if (coversViewBtn) coversViewBtn.addEventListener('click', () => setView('covers'));
        if (settingsBtn) settingsBtn.addEventListener('click', showSettingsModal);
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', hideSettingsModal);
        if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', handleSearchSubmit);
        if (searchCancelBtn) searchCancelBtn.addEventListener('click', hideSearchModal);
        if (filterApplyBtn) filterApplyBtn.addEventListener('click', handleFilterApply);
        if (filterClearBtn) filterClearBtn.addEventListener('click', () => { clearFilters(); hideFilterModal(); });
        if (filterCancelBtn) filterCancelBtn.addEventListener('click', hideFilterModal);
        if (ratingSaveBtn) ratingSaveBtn.addEventListener('click', handleRatingSave);
        if (ratingCancelBtn) ratingCancelBtn.addEventListener('click', closeRatingModal);
        if (ratingCloseBtn) ratingCloseBtn.addEventListener('click', closeRatingModal);
        if (isbnLookupButton) isbnLookupButton.addEventListener('click', handleIsbnLookup);
        if (addManuallyBtn) addManuallyBtn.addEventListener('click', () => { hideIsbnInputModal(); currentlyFetchedApiData = null; showAddBookModal(false, "Add Book Manually"); });
        if (cancelIsbnInputButton) cancelIsbnInputButton.addEventListener('click', () => { hideIsbnInputModal(); });

        console.log("[DOMContentLoaded] Setup complete.");

    } catch (error) {
        console.error("[DOMContentLoaded] CRITICAL ERROR DURING SETUP:", error);
        alert("A critical error occurred while loading the application. Please check the console for details and try refreshing the page.");
    }
});

// --- START: Book Deletion Function ---
function handleDeleteBook(bookId) {
    if (!bookId) {
        console.error("handleDeleteBook called with no bookId");
        return;
    }

    const bookToDelete = allBooks.find(b => b.id === bookId);
    if (!bookToDelete) {
        console.error(`Book with ID ${bookId} not found for deletion.`);
        alert("Error: Book not found for deletion.");
        return;
    }

    // Confirmation dialog
    if (confirm(`Are you sure you want to delete "${bookToDelete.title}"? This cannot be undone.`)) {
        allBooks = allBooks.filter(b => b.id !== bookId);
        saveBooksToStorage(allBooks);
        hideBookDetailModal(); // Close the modal
        renderBooks(); // Refresh the book display
        console.log(`Book "${bookToDelete.title}" (ID: ${bookId}) deleted.`);
    } else {
        console.log(`Deletion of book "${bookToDelete.title}" cancelled.`);
    }
}
// --- END: Book Deletion Function ---

// --- START: View Mode Functions ---
function setView(newView) {
    if (!['grid', 'list', 'covers'].includes(newView)) {
        console.warn("Invalid view mode specified:", newView);
        return;
    }
    currentView = newView;
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, newView);
    console.log(`View mode set to: ${newView}`);

    // Update active state on buttons
    const viewButtons = [
        document.getElementById('grid-view-btn'),
        document.getElementById('list-view-btn'),
        document.getElementById('covers-view-btn')
    ];
    viewButtons.forEach(button => {
        if (button) {
            if (button.id === `${newView}-view-btn`) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    });

    renderBooks(); // Re-render books with the new view
}
// --- END: View Mode Functions ---

// --- START: Search Logic ---
function clearSearch() {
    const searchNavBtn = document.getElementById('search-nav-btn');
    console.log("[clearSearch] Clearing search state and resetting button.");
    isSearchActive = false;
    currentSearchTerm = '';
    if (searchNavBtn) {
        searchNavBtn.innerHTML = '<span class="material-symbols-outlined">search</span><span>Search</span>';
    }
    // If filters were active with search, they should also be cleared or re-evaluated
    // For simplicity now, clearing them. This matches behavior of new search.
    if (isFilterActive) {
        // Re-evaluate if home or wishlist should be active after clearing search and filters.
        // This logic will be handled by setActiveNavButtons if it's called after clearing filters too.
        // clearFilters(); // Option: clear filters too. For now, let renderBooks handle it.
    }
    renderBooks();
    setActiveNavButtons(); // This will set home or wishlist active as appropriate
}

function handleSearchSubmit() {
    const searchInputElement = document.getElementById('search-input');
    const searchTerm = searchInputElement ? searchInputElement.value.trim() : '';
    const searchStatusElement = document.getElementById('search-status');
    const searchNavBtn = document.getElementById('search-nav-btn');

    console.log(`[handleSearchSubmit] Search initiated with term: "${searchTerm}"`);

    if (!searchTerm) {
        if (searchStatusElement) searchStatusElement.textContent = 'Please enter a search term.';
        console.log("[handleSearchSubmit] Search term is empty.");
        // If search term is empty but search was active, clear it
        if (isSearchActive) clearSearch();
        return;
    }

    currentSearchTerm = searchTerm;
    isSearchActive = true;
    isWishlistViewActive = false; // Search results view takes precedence
    isFilterActive = false; // Clear active filters when a new search is performed
    activeFilters = { status: [], reader: [], targetRating: 0 }; // Reset filter object

    if (searchNavBtn) {
        searchNavBtn.innerHTML = '<span class="material-symbols-outlined">close</span><span>Search</span>'; // Changed from Clear Search
    }

    console.log(`[handleSearchSubmit] State updated: isSearchActive=${isSearchActive}, currentSearchTerm="${currentSearchTerm}"`);

    hideSearchModal();
    renderBooks();
    setActiveNavButtons(); // Update nav highlights

    if (searchStatusElement) searchStatusElement.textContent = ''; // Clear status on successful search
}
// --- END: Search Logic ---

// --- START: Filter Modal Functions ---
function handleFilterApply() {
    console.log("[handleFilterApply] Applying filters.");
    const filterForm = document.getElementById('filter-form');
    if (!filterForm) {
        console.error("[handleFilterApply] Filter form not found!");
        return;
    }

    // Get Sort Order
    const sortSelect = document.getElementById('filter-sort-select');
    if (sortSelect && sortSelect.value) {
        const [field, direction] = sortSelect.value.split('_');
        currentSort = { field, direction };
        console.log("[handleFilterApply] Sort updated:", currentSort);
    }

    // Get Status Filters
    const statusCheckboxes = filterForm.querySelectorAll('input[name="filter-status"]:checked');
    activeFilters.status = Array.from(statusCheckboxes).map(cb => cb.value);
    console.log("[handleFilterApply] Status filters updated:", activeFilters.status);

    // Get Reader Filters
    const readerCheckboxes = filterForm.querySelectorAll('input[name="filter-reader"]:checked');
    activeFilters.reader = Array.from(readerCheckboxes).map(cb => cb.value);
    console.log("[handleFilterApply] Reader filters updated:", activeFilters.reader);

    // Get Rating Filter
    const ratingRadio = filterForm.querySelector('input[name="filter-rating"]:checked');
    activeFilters.targetRating = ratingRadio ? parseInt(ratingRadio.value, 10) : 0;
    console.log("[handleFilterApply] Rating filter updated:", activeFilters.targetRating);

    isFilterActive = activeFilters.status.length > 0 || activeFilters.reader.length > 0 || activeFilters.targetRating !== 0;
    
    // DO NOT change isWishlistViewActive or isSearchActive here.
    // These flags determine the base view being filtered.

    console.log(`[handleFilterApply] State updated: isFilterActive=${isFilterActive}`);

    hideFilterModal();
    renderBooks(); // renderBooks will use the current isSearchActive/isWishlistViewActive and apply new filters
    setActiveNavButtons();
}

// clearFilters() already exists and handles resetting state and rendering.
// --- END: Filter Modal Functions ---

// --- START: Rating Modal Functions ---
function openRatingModal(bookId, isInitial = false) {
    console.log(`[openRatingModal] Called for bookId: ${bookId}, isInitial: ${isInitial}`);
    if (!ratingReviewModal || !interactiveStarsContainer || !ratingModalTitle || !reviewInput || !ratingValueDisplay) {
        console.error("Rating modal UI elements not found.");
        return;
    }

    currentRatingBookId = bookId;
    const book = allBooks.find(b => b.id === bookId);

    if (!book) {
        console.error(`[openRatingModal] Book with ID ${bookId} not found.`);
        return;
    }

    initialRatingValue = book.personalRating || 0;
    initialReviewValue = book.review || '';
    currentRatingValue = initialRatingValue; 
    let potentialRating = currentRatingValue; 
    let isDraggingRating = false; // Flag for drag state

    isInitialRatingMode = isInitial; 

    ratingModalTitle.textContent = `Rate & Review: ${book.title}`;
    
    reviewInput.value = currentReviewValue;
    reviewInput.readOnly = false;
    reviewInput.style.display = 'block';

    renderStarPlaceholders(interactiveStarsContainer); 
    updateStarDisplay(currentRatingValue, interactiveStarsContainer);
    updateRatingValueDisplay(currentRatingValue); 

    const calculateRatingFromEvent = (event) => {
        const rect = interactiveStarsContainer.getBoundingClientRect();
        let x;
        if (event.touches && event.touches.length > 0) {
            x = event.touches[0].clientX - rect.left;
        } else {
            x = event.clientX - rect.left;
        }
        const width = rect.width;
        let hoverRating = (x / width) * 5; 
        hoverRating = Math.min(5, Math.max(0, hoverRating));
        return Math.round(hoverRating * 2) / 2; // Rounded to nearest 0.5
    };

    const handleInteractionStart = (event) => {
        isDraggingRating = true;
        potentialRating = calculateRatingFromEvent(event);
        currentRatingValue = potentialRating; // Set on start for immediate feedback if it's a click
        updateStarDisplay(currentRatingValue, interactiveStarsContainer);
        updateRatingValueDisplay(currentRatingValue);
        console.log(`[InteractiveStars] Interaction Start/Click. New currentRatingValue: ${currentRatingValue}`);
    };

    const handleInteractionMove = (event) => {
        potentialRating = calculateRatingFromEvent(event);
        if (isDraggingRating) {
            currentRatingValue = potentialRating;
            updateStarDisplay(currentRatingValue, interactiveStarsContainer);
            updateRatingValueDisplay(currentRatingValue); 
        } else {
            // Only visual hover effect if not dragging
            updateStarDisplay(potentialRating, interactiveStarsContainer);
        }
    };

    const handleInteractionEnd = () => {
        if (isDraggingRating) {
            // currentRatingValue is already set by the last move event
            console.log(`[InteractiveStars] Interaction End. Final currentRatingValue: ${currentRatingValue}`);
            isDraggingRating = false;
        }
        // On mouseleave, if not dragging, revert to currentRatingValue display
        if (!isDraggingRating) { 
             updateStarDisplay(currentRatingValue, interactiveStarsContainer);
        }
    };
    
    const handleMouseLeave = () => {
        if (!isDraggingRating) { // Only revert if not actively dragging out of bounds
            updateStarDisplay(currentRatingValue, interactiveStarsContainer);
            potentialRating = currentRatingValue; 
        }
    };

    // Store bound listeners
    interactiveStarsContainer._boundMouseDown = handleInteractionStart.bind(interactiveStarsContainer);
    interactiveStarsContainer._boundMouseMove = handleInteractionMove.bind(interactiveStarsContainer);
    interactiveStarsContainer._boundMouseUp = handleInteractionEnd.bind(interactiveStarsContainer);
    interactiveStarsContainer._boundMouseLeave = handleMouseLeave.bind(interactiveStarsContainer); // Keep separate mouseleave for hover

    interactiveStarsContainer._boundTouchStart = handleInteractionStart.bind(interactiveStarsContainer);
    interactiveStarsContainer._boundTouchMove = handleInteractionMove.bind(interactiveStarsContainer);
    interactiveStarsContainer._boundTouchEnd = handleInteractionEnd.bind(interactiveStarsContainer);

    // Mouse events
    interactiveStarsContainer.addEventListener('mousedown', interactiveStarsContainer._boundMouseDown);
    interactiveStarsContainer.addEventListener('mousemove', interactiveStarsContainer._boundMouseMove);
    // window.addEventListener('mouseup', interactiveStarsContainer._boundMouseUp); // Listen on window for mouseup
    document.addEventListener('mouseup', interactiveStarsContainer._boundMouseUp); // More robust: listen on document for mouseup
    interactiveStarsContainer.addEventListener('mouseleave', interactiveStarsContainer._boundMouseLeave);

    // Touch events
    interactiveStarsContainer.addEventListener('touchstart', interactiveStarsContainer._boundTouchStart, { passive: false });
    interactiveStarsContainer.addEventListener('touchmove', interactiveStarsContainer._boundTouchMove, { passive: false });
    interactiveStarsContainer.addEventListener('touchend', interactiveStarsContainer._boundTouchEnd);
    interactiveStarsContainer.addEventListener('touchcancel', interactiveStarsContainer._boundTouchEnd); // Handle cancelled touches

    showModal(ratingReviewModal);
    console.log(`[openRatingModal] Modal shown. Initial rating: ${currentRatingValue}, Initial review: "${currentReviewValue}"`);
}

function closeRatingModal() {
    console.log("[closeRatingModal] Closing rating modal.");
    if (!ratingReviewModal) {
        console.error("Rating modal element not found for closing.");
        return;
    }
    hideModal(ratingReviewModal);

    if (interactiveStarsContainer) {
        interactiveStarsContainer.removeEventListener('mousedown', interactiveStarsContainer._boundMouseDown);
        interactiveStarsContainer.removeEventListener('mousemove', interactiveStarsContainer._boundMouseMove);
        // window.removeEventListener('mouseup', interactiveStarsContainer._boundMouseUp);
        document.removeEventListener('mouseup', interactiveStarsContainer._boundMouseUp);
        interactiveStarsContainer.removeEventListener('mouseleave', interactiveStarsContainer._boundMouseLeave);
        delete interactiveStarsContainer._boundMouseDown;
        delete interactiveStarsContainer._boundMouseMove;
        delete interactiveStarsContainer._boundMouseUp;
        delete interactiveStarsContainer._boundMouseLeave;

        interactiveStarsContainer.removeEventListener('touchstart', interactiveStarsContainer._boundTouchStart);
        interactiveStarsContainer.removeEventListener('touchmove', interactiveStarsContainer._boundTouchMove);
        interactiveStarsContainer.removeEventListener('touchend', interactiveStarsContainer._boundTouchEnd);
        interactiveStarsContainer.removeEventListener('touchcancel', interactiveStarsContainer._boundTouchEnd);
        delete interactiveStarsContainer._boundTouchStart;
        delete interactiveStarsContainer._boundTouchMove;
        delete interactiveStarsContainer._boundTouchEnd;

        interactiveStarsContainer.innerHTML = ''; 
    }

    // Reset state (omitted for brevity, same as before)
    currentRatingBookId = null;
    currentRatingValue = 0;
    currentReviewValue = '';
    initialRatingValue = 0;
    initialReviewValue = '';
    isRatingInteractionActive = false; 
    if (reviewInput) {
        reviewInput.value = '';
        reviewInput.readOnly = true;
        reviewInput.style.display = 'none';
    }
    if (ratingValueDisplay) ratingValueDisplay.textContent = '0 / 5 stars';
    console.log("[closeRatingModal] Modal closed and state reset.");
}

function updateRatingValueDisplay(rating) {
    if (ratingValueDisplay) {
        const displayRating = rating > 0 ? rating.toFixed(1) : "0"; // toFixed(1) handles .0 and .5
        ratingValueDisplay.textContent = `${displayRating} / 5 stars`;
    }
}

// Renamed from renderInteractiveStars - this now just creates placeholders
function renderStarPlaceholders(container) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous stars
    const totalStars = 5;

    console.log(`[renderStarPlaceholders] Creating ${totalStars} star SVGs.`);

    for (let i = 1; i <= totalStars; i++) {
        const starOuter = document.createElement('span'); // Still use a span for structure if needed by CSS
        starOuter.classList.add('interactive-star-outer'); // Keep for styling if any
        // No more dataset.value or individual event listeners here for rating logic

        const starSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        starSvg.setAttribute("class", "rating-star-svg interactive"); // 'interactive' class for styling
        starSvg.setAttribute("viewBox", "0 0 51 48");
        // SVG should not capture pointer events if interaction is on container
        starSvg.style.pointerEvents = 'none'; 
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z");
        starSvg.appendChild(path);
        starOuter.appendChild(starSvg);
        container.appendChild(starOuter);
    }
}

// New function to update the visual display of stars
function updateStarDisplay(rating, container) {
    if (!container) return;
    const starSvgs = container.querySelectorAll('.rating-star-svg');
    if (starSvgs.length !== 5) {
        console.error("[updateStarDisplay] Incorrect number of star SVGs found in container.");
        return;
    }
    
    const clampedRating = Math.min(5, Math.max(0, rating)); // Ensure rating is between 0 and 5

    starSvgs.forEach((svg, index) => {
        svg.classList.remove('filled', 'half-filled'); // Reset classes
        const starValue = index + 1;

        if (clampedRating >= starValue) {
            svg.classList.add('filled');
        } else if (clampedRating >= starValue - 0.5) {
            svg.classList.add('half-filled');
        }
    });
}

// handleRatingSave will be defined next.

function handleRatingSave() {
    console.log("[handleRatingSave] Attempting to save rating and review.");
    if (!currentRatingBookId) {
        console.error("[handleRatingSave] No currentRatingBookId set. Cannot save.");
        return;
    }

    const bookIndex = allBooks.findIndex(b => b.id === currentRatingBookId);
    if (bookIndex === -1) {
        console.error(`[handleRatingSave] Book with ID ${currentRatingBookId} not found in allBooks.`);
        return;
    }

    // Get the review text from the input field
    currentReviewValue = reviewInput ? reviewInput.value.trim() : initialReviewValue; 

    console.log(`[handleRatingSave] Saving for book ID ${currentRatingBookId}: Rating=${currentRatingValue}, Review="${currentReviewValue}"`);

    allBooks[bookIndex].personalRating = currentRatingValue;
    allBooks[bookIndex].review = currentReviewValue;

    saveBooksToStorage(allBooks);
    console.log("[handleRatingSave] Rating and review saved to storage.");
    renderBooks(); // Re-render to reflect potential changes in rating display
    
    // If the detail modal was open for this book, refresh its rating and review section
    if (detailModalBookId === currentRatingBookId) {
        console.log("[handleRatingSave] Detail modal open for this book, attempting to refresh its content.");
        // Temporarily hide and show to re-trigger population logic (or directly update fields)
        const bookForDetail = allBooks[bookIndex];
        if (detailRating) detailRating.innerHTML = bookForDetail.personalRating ? renderStars(bookForDetail.personalRating) : 'Not Rated';
        const reviewSection = document.getElementById('detail-review-section');
        const reviewTextElement = document.getElementById('detail-review-text'); // Ensure this ID is correct
        if (reviewSection && reviewTextElement) {
            if (bookForDetail.review && bookForDetail.review.trim() !== '') {
                reviewTextElement.textContent = bookForDetail.review;
                reviewSection.style.display = 'block';
            } else {
                reviewTextElement.textContent = '';
                reviewSection.style.display = 'none';
            }
        }
    }

    closeRatingModal();
    console.log("[handleRatingSave] Rating save process complete.");
}

// --- END: Rating Modal Functions ---

// --- START: CSV Export/Import Functions ---

function escapeCsvField(field) {
    if (field === null || typeof field === 'undefined') {
        return '';
    }
    let fieldStr = String(field);
    // If the field contains a comma, a newline, or a double quote, then enclose it in double quotes.
    if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('"')) {
        // Escape existing double quotes by doubling them.
        fieldStr = fieldStr.replace(/"/g, '""');
        fieldStr = `"${fieldStr}"`;
    }
    return fieldStr;
}

function handleExportData() {
    console.log("[handleExportData] Starting data export to CSV.");
    if (allBooks.length === 0) {
        alert("No books to export.");
        console.log("[handleExportData] No books available for export.");
        return;
    }

    // Define headers - ensure they match BookV2 properties and desired CSV structure
    const headers = [
        'id', 'isbn', 'title', 'authors', 'coverImageUrl', 'synopsis',
        'publisher', 'publicationYear', 'pageCount', 'apiGenres',
        'apiSeriesTitle', 'apiSeriesNumber', 'reader', 'status',
        'personalRating', 'dateAdded', 'dateFinished', 'customTags',
        'userSeriesTitle', 'userSeriesNumber', 'userPageCount',
        'userCoverImageUrl', 'review'
    ];

    let csvContent = headers.map(escapeCsvField).join(',') + '\r\n'; // Header row

    allBooks.forEach(book => {
        const row = headers.map(header => {
            let value = book[header];
            if (Array.isArray(value)) {
                // For arrays (like authors, apiGenres, customTags), join them into a single string.
                // Using a semicolon as an internal separator for array elements within a CSV field.
                // This will be unescaped during import.
                return escapeCsvField(value.join('; '));
            }
            return escapeCsvField(value);
        });
        csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // Feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "bookshelf_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("[handleExportData] CSV export file download triggered.");
    } else {
        alert("CSV export is not supported in your browser.");
        console.error("[handleExportData] CSV export not supported.");
    }
    hideSettingsModal();
}

// Placeholder for import functions - to be implemented next
function handleImportDataTrigger() {
    console.log("[handleImportDataTrigger] Import data button clicked.");
    // This function will trigger the click on a hidden file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error("CSV file input element not found.");
        alert("Error: File input for import not found.");
    }
}

function unescapeCsvField(fieldStr) {
    if (fieldStr.startsWith('"') && fieldStr.endsWith('"')) {
        // Remove surrounding quotes
        fieldStr = fieldStr.substring(1, fieldStr.length - 1);
        // Unescape doubled double quotes
        fieldStr = fieldStr.replace(/""/g, '"');
    }
    return fieldStr;
}

function processImportedCsv(event) {
    console.log("[processImportedCsv] File selected for import.");
    const file = event.target.files[0];
    if (!file) {
        console.log("[processImportedCsv] No file selected.");
        return;
    }

    if (!confirm("Importing this CSV will replace all current bookshelf data. Are you sure you want to proceed?")) {
        console.log("[processImportedCsv] Import cancelled by user.");
        // Reset file input to allow selecting the same file again if needed
        event.target.value = null;
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        console.log("[processImportedCsv] CSV data loaded from file.");
        try {
            const lines = csvData.split(/\r\n|\n/);
            if (lines.length < 2) {
                alert("Error: CSV file is empty or has no data rows.");
                console.error("[processImportedCsv] CSV file empty or no data.");
                return;
            }

            // Basic CSV line splitting (can be fragile for complex CSVs with escaped delimiters within unquoted fields)
            const parseCsvLine = (line) => {
                const result = [];
                let currentField = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '\"' && (i + 1 < line.length && line[i+1] === '\"')) { // Escaped quote
                        currentField += '\"';
                        i++; // Skip next quote
                    } else if (char === '\"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(currentField);
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                result.push(currentField); // Add last field
                return result.map(unescapeCsvField);
            };

            const headers = parseCsvLine(lines[0]);
            console.log("[processImportedCsv] CSV Headers:", headers);

            const importedBooksRaw = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue; // Skip empty lines
                const values = parseCsvLine(lines[i]);
                if (values.length !== headers.length) {
                     console.warn(`[processImportedCsv] Skipping line ${i+1}: Mismatched number of columns. Expected ${headers.length}, got ${values.length}. Line: ${lines[i]}`);
                    continue;
                }
                const bookObject = {};
                headers.forEach((header, index) => {
                    bookObject[header.trim()] = values[index];
                });
                importedBooksRaw.push(bookObject);
            }
            
            console.log(`[processImportedCsv] Parsed ${importedBooksRaw.length} raw book objects from CSV.`);

            const newBooks = importedBooksRaw.map((data, index) => {
                // Convert array-like strings back to arrays
                const parseArrayField = (fieldValue) => {
                    if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
                        return fieldValue.split('; ').map(s => s.trim()).filter(Boolean);
                    }
                    return [];
                };

                // Convert numbers and booleans from strings
                const personalRating = data.personalRating ? parseFloat(data.personalRating) : null;
                const pageCount = data.pageCount ? parseInt(data.pageCount, 10) : null;
                const userPageCount = data.userPageCount ? parseInt(data.userPageCount, 10) : null;
                // publicationYear can remain a string or be parsed if strict number format expected

                return new BookV2(
                    data.isbn,
                    data.title,
                    parseArrayField(data.authors),
                    data.coverImageUrl,
                    data.synopsis,
                    data.publisher,
                    data.publicationYear,
                    pageCount, // Converted
                    parseArrayField(data.apiGenres),
                    data.apiSeriesTitle,
                    data.apiSeriesNumber,
                    data.reader,
                    data.status,
                    personalRating, // Converted
                    data.dateAdded || new Date().toISOString(), // Ensure dateAdded has a value
                    data.dateFinished || null,
                    parseArrayField(data.customTags),
                    data.userSeriesTitle,
                    data.userSeriesNumber,
                    userPageCount, // Converted
                    data.userCoverImageUrl,
                    data.review || ''
                );
            });

            allBooks = newBooks;
            saveBooksToStorage(allBooks);
            console.log(`[processImportedCsv] ${allBooks.length} books imported and saved to storage.`);

            // Update series datalist from imported books
            const allSeriesTitles = new Set();
            allBooks.forEach(book => {
                if (book.userSeriesTitle) allSeriesTitles.add(book.userSeriesTitle.trim());
                if (book.apiSeriesTitle) allSeriesTitles.add(book.apiSeriesTitle.trim());
            });
            saveSeriesTitles(Array.from(allSeriesTitles));
            populateSeriesDatalist();
            console.log("[processImportedCsv] Series datalist updated.");

            renderBooks();
            setActiveNavButtons(); // Ensure nav state is correct
            hideSettingsModal();
            alert(`Import successful! ${allBooks.length} books loaded.`);

        } catch (error) {
            console.error("[processImportedCsv] Error processing CSV file:", error);
            alert("Error processing CSV file. Please ensure it is a valid bookshelf CSV export.");
        }
        // Reset file input to allow selecting the same file again if needed
        event.target.value = null;
    };

    reader.onerror = function() {
        console.error("[processImportedCsv] FileReader error.");
        alert("Error reading the file.");
        event.target.value = null;
    };

    reader.readAsText(file);
}
// --- END: CSV Export/Import Functions ---