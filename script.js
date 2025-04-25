console.log("Bookshelf app script loaded. Waiting for DOMContentLoaded...");

// --- Data Model ---
class BookV2 {
    constructor(
        isbn = '', title = '', authors = [], coverImageUrl = '', synopsis = '',
        publisher = '', publicationYear = '', pageCount = null, apiGenres = [],
        apiSeriesTitle = '', apiSeriesNumber = '', reader = '', status = '',
        personalRating = null, dateAdded = new Date().toISOString(), dateFinished = null,
        customTags = [], userSeriesTitle = '',
        userSeriesNumber = '', userPageCount = null, userCoverImage = null,
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
        this.userCoverImage = userCoverImage;
        this.review = review;
        this.id = isbn || `${title}-${dateAdded}`;
    }
    get seriesTitle() { return this.userSeriesTitle || this.apiSeriesTitle; }
    get seriesNumber() { return this.userSeriesNumber || this.apiSeriesNumber; }
    get effectivePageCount() { return this.userPageCount !== null ? this.userPageCount : this.pageCount; }
    get displayCoverUrl() { return this.userCoverImage || this.coverImageUrl || 'placeholder-cover.png'; }
}

// --- Local Storage Interaction ---
const STORAGE_KEY = 'victoriaBookshelfData';
const SERIES_STORAGE_KEY = 'victoriaBookshelfSeriesTitles';
function loadBooksFromStorage() {
    const jsonData = localStorage.getItem(STORAGE_KEY);
    console.log("[loadBooks] Loaded JSON from localStorage:", jsonData ? jsonData.substring(0, 200) + '...' : 'null'); // Log start of JSON
    if (!jsonData) { return []; }
    try {
        const loadedData = JSON.parse(jsonData);
        console.log(`[loadBooks] Parsed ${loadedData.length} raw book objects.`);
        return loadedData.map((data, index) => {
            // Log cover URLs for the first few books being reconstructed
            if (index < 3) { // Log first 3
                 console.log(`[loadBooks] Reconstructing book ${index}: Title=${data.title}, API Cover=${data.coverImageUrl}, User Cover=${!!data.userCoverImage}`);
            }
            return new BookV2(
                data.isbn, data.title, data.authors, data.coverImageUrl, data.synopsis,
                data.publisher, data.publicationYear, data.pageCount, data.apiGenres,
                data.apiSeriesTitle, data.apiSeriesNumber, data.reader, data.status,
                data.personalRating, data.dateAdded, data.dateFinished, data.customTags,
                data.userSeriesTitle, data.userSeriesNumber, data.userPageCount,
                data.userCoverImage, data.review || ''
            );
        });
    } catch (error) {
        console.error("Error parsing or reconstructing book data:", error);
        return [];
    }
}
function saveBooksToStorage(books) {
    if (!Array.isArray(books)) { console.error("Invalid data type for saving books."); return; }
    // Log cover URLs for the first few books being saved
    console.log(`[saveBooks] Attempting to save ${books.length} books.`);
    books.slice(0, 3).forEach((book, index) => {
        console.log(`[saveBooks] Book ${index} to save: Title=${book.title}, API Cover=${book.coverImageUrl}, User Cover=${!!book.userCoverImage}`);
    });
    try { 
        const jsonToSave = JSON.stringify(books);
        console.log("[saveBooks] Saving JSON:", jsonToSave.substring(0, 200) + '...'); // Log start of JSON
        localStorage.setItem(STORAGE_KEY, jsonToSave); 
    } catch (error) { 
        console.error("Error saving book data:", error); 
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
let currentView = 'grid';
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

// User Cover Upload State
let selectedCoverImageDataUrl = null;
let customCoverRemoved = false; // Re-add flag

// --- UI Elements (Declarations at Global Scope) ---
let bookDisplayArea, viewToggleButton, addBookButton, isbnInputContainer, isbnManualInput,
    isbnLookupButton, cancelIsbnInputButton, lookupStatusElement, seriesTitlesDatalist,
    addBookFormContainer, addBookForm, cancelAddBookButton, addBookFormTitle, resetDataButton,
    bookDetailModal, detailCover, detailTitle, detailAuthor, detailSeries, detailRating,
    detailStatus, detailReader, detailDateAdded, detailDateFinished, detailGenres, detailTags,
    detailSynopsis, detailPageCount, detailPublisher, detailPublicationYear, detailIsbn,
    detailNotesSection, detailNotes, editBookBtn, closeDetailBtn, formCoverPreview, apiGenresDisplay,
    formApiGenres, saveBookBtn, synopsisDisplayText, editSynopsisBtn, synopsisEditInput,
    detailReviewSection, detailReviewText, ratingModal, ratingModalTitle, interactiveStarsContainer,
    ratingValueDisplay, reviewSection, reviewDisplayArea, reviewDisplayText, editReviewBtn,
    reviewInput, ratingCancelBtn, ratingSaveBtn, ratingCloseBtn,
    searchBtn, searchModal, searchInput, searchSubmitBtn, searchCancelBtn, searchStatusElement,
    wishlistBtn, filterBtn, filterModal, filterForm, filterApplyBtn, filterClearBtn, filterCancelBtn,
    sortSelect, removeCustomCoverBtn, // Re-add removeCustomCoverBtn variable
    addManuallyBtn, deleteBookBtn; // Add new button variables


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
    if (!bookDisplayArea) {
        console.error("Unable to find book display area");
        return;
    }

    // Get filtered and sorted books
    let displayBooks = allBooks;
    
    // Search functionality (keep for now, integrate later)
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

    // Wishlist view filter
        if (isWishlistViewActive) {
        displayBooks = displayBooks.filter(book => book.status === 'Wishlist');
    }

    // Apply active filters
    if (isFilterActive) {
        if (activeFilters.status && activeFilters.status.length > 0) {
            displayBooks = displayBooks.filter(book => activeFilters.status.includes(book.status));
        }
        if (activeFilters.reader && activeFilters.reader.length > 0) {
            displayBooks = displayBooks.filter(book => activeFilters.reader.includes(book.reader));
        }
        if (activeFilters.targetRating > 0) {
            displayBooks = displayBooks.filter(book => 
                (book.personalRating === activeFilters.targetRating) || 
                (activeFilters.targetRating === -1 && !book.personalRating)
            );
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
        bookDisplayArea.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">menu_book</span>
                <p>${isWishlistViewActive ? 'Your wishlist is empty' : isSearchActive ? 'No books match your search' : isFilterActive ? 'No books match your filters' : 'Your bookshelf is empty'}.</p>
                <button id="empty-add-book-btn" class="btn-primary">
                    <span class="material-symbols-outlined">add</span> Add a Book
                </button>
            </div>
        `;
        // Add listener for the empty state add button
        const emptyAddBtn = document.getElementById('empty-add-book-btn');
        if (emptyAddBtn) {
            emptyAddBtn.addEventListener('click', showIsbnInputModal);
        }
        return;
    }

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
                                    : ''}
                            </div>
                            ${!book.personalRating ? `
                            <div class="static-star-rating">
                                ${renderStars(book.personalRating)}
                            </div>` : ''}
                        </div>
                    <div class="book-actions">
                            ${book.status === 'Wishlist' 
                                ? `<button class="btn-add-to-bookshelf" data-book-id="${book.id}">Add to Bookshelf</button>` 
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

    // Show the add book form pre-populated with the book data
    book.status = 'Unfinished'; // Default status when adding to bookshelf
    showAddBookModal(true, `Add ${book.title} to Bookshelf`);
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
function showIsbnInputModal() {
    if (isbnInputContainer) {
        console.log("[showIsbnInputModal] Showing ISBN modal. Clearing fetched data."); // Log function call
        currentlyFetchedApiData = null;
        if (isbnManualInput) isbnManualInput.value = '';
        if (lookupStatusElement) lookupStatusElement.textContent = 'Type or dictate the ISBN, then click Lookup.';
        isbnInputContainer.classList.add('visible');
        if (isbnManualInput) isbnManualInput.focus();
    }
}
function hideIsbnInputModal() { if (isbnInputContainer) { isbnInputContainer.classList.remove('visible'); } }

function showAddBookModal(skipReset = false, title = "Add New Book") {
    if (!addBookFormContainer || !addBookFormTitle || !addBookForm || !saveBookBtn) {
        console.error("One or more add book modal elements not found!");
        return;
    }
    customCoverRemoved = false; // Reset flag
    if (!skipReset) {
        currentlyFetchedApiData = null;
        currentlyEditingBookId = null; // Ensure editing state is cleared
        selectedCoverImageDataUrl = null; // Reset selected cover image
        if (addBookForm) addBookForm.reset();
        const synopsisDisplay = addBookForm.querySelector('.synopsis-display-area');
        const synopsisInput = addBookForm.querySelector('#synopsis-edit-input');
        const displayArea = addBookForm.querySelector('.synopsis-display-area');
        if(displayArea) displayArea.style.display = '';
        if(synopsisInput) synopsisInput.style.display = 'none';
        if(formCoverPreview) {
             formCoverPreview.src = '#'; // Clear preview source
             formCoverPreview.style.display = 'none'; // Hide preview on reset
        }
    }
    if (addBookFormTitle) { addBookFormTitle.textContent = title; }
    populateSeriesDatalist();
    // Hide remove button initially *only* when adding a new book (not editing)
    if (!skipReset && removeCustomCoverBtn) {
         console.log('[showAddBookModal] Hiding remove button for new book.');
         removeCustomCoverBtn.style.display = 'none';
         // We might not need to disable it if it's hidden, but let's keep it for safety
         removeCustomCoverBtn.disabled = true;
    } else if (skipReset) {
        // If editing, startEditBook will handle visibility, so don't hide here.
        console.log('[showAddBookModal] Skipping remove button hide for edit mode.');
    } else if (!removeCustomCoverBtn) {
        console.error('[showAddBookModal] removeCustomCoverBtn variable is not defined here!');
    }
    addBookFormContainer.classList.add('visible');
    /* // Remove the focus call to see if it prevents field clearing
        if (!skipReset) { // Focus logic only runs for non-prefill/non-edit
            const firstInput = addBookForm?.querySelector('#title');
            if (firstInput) firstInput.focus();
        }
        */
    
}
function hideAddBookModal() { if (addBookFormContainer) { addBookFormContainer.classList.remove('visible'); currentlyEditingBookId = null; } } // Clear edit ID on hide

function showBookDetailModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) { console.error(`Book not found for detail view: ${bookId}`); return; }
    if (!bookDetailModal) { console.error("bookDetailModal element not found!"); return; }

    detailModalBookId = bookId; // Store the ID for the Edit button

    const setText = (element, text) => { if (element) element.textContent = text ?? 'N/A'; };
    if (detailCover) { detailCover.src = book.displayCoverUrl; detailCover.onerror = () => { detailCover.src = 'placeholder-cover.png'; }; detailCover.alt = `Cover for ${book.title}`; }
    setText(detailTitle, book.title);
    setText(detailAuthor, book.authors.join(', '));
    setText(detailSeries, book.seriesTitle ? `${book.seriesTitle}${book.seriesNumber ? ` (#${book.seriesNumber})` : ''}` : 'N/A');
    if (detailRating) {
        // Only show rating if not a wishlist item
        if (book.status !== 'Wishlist') {
            detailRating.innerHTML = renderStars(book.personalRating, false);
            detailRating.style.display = '';
        } else {
            detailRating.innerHTML = ''; // Clear content
            detailRating.style.display = 'none'; // Hide rating area
        }
    }
    setText(detailStatus, book.status);
    setText(detailReader, book.reader);
    setText(detailDateAdded, formatDisplayDate(book.dateAdded));
    setText(detailDateFinished, formatDisplayDate(book.dateFinished));
    setText(detailGenres, book.apiGenres.join(', ') || 'N/A');
    setText(detailTags, book.customTags.join(', ') || 'N/A');
    setText(detailSynopsis, book.synopsis);
    setText(detailPageCount, book.effectivePageCount ?? 'N/A');
    setText(detailPublisher, book.publisher);
    setText(detailPublicationYear, book.publicationYear);
    setText(detailIsbn, book.isbn);

    // Review Display
    if (detailReviewSection && detailReviewText) {
         if (book.review && book.status !== 'Wishlist') { // Show review only if not wishlist
            detailReviewText.textContent = book.review;
            detailReviewSection.style.display = '';
        } else {
            detailReviewText.textContent = '';
            detailReviewSection.style.display = 'none';
        }
    }
    // Notes Display
    if (detailNotesSection && detailNotes) {
         if (book.notes) { // Check if book object has notes property
            setText(detailNotes, book.notes);
            detailNotesSection.style.display = '';
         } else {
             setText(detailNotes, '');
             detailNotesSection.style.display = 'none';
         }
    }
    // Show/Hide Edit button based on status? Edit button should probably always show.
    if (editBookBtn) editBookBtn.style.display = 'inline-block';

    bookDetailModal.classList.add('visible');
}
function hideBookDetailModal() { if (bookDetailModal) { bookDetailModal.classList.remove('visible'); detailModalBookId = null; } }

function openRatingModal(bookId, isInitial) {
    if (!ratingModal) { console.error("Rating modal element not found!"); return; }
    const book = allBooks.find(b => b.id === bookId);
    if (!book) { console.error(`Book not found for rating: ${bookId}`); return; }
    // Prevent opening rating modal for Wishlist items
    if (book.status === 'Wishlist') {
        console.log(`Cannot rate book ${bookId} because it is on the Wishlist.`);
        alert("Cannot rate a book that is on the wishlist.");
        return;
    }

    currentRatingBookId = bookId;
    isInitialRatingMode = isInitial;
    initialRatingValue = book.personalRating || 0;
    initialReviewValue = book.review || '';
    currentRatingValue = initialRatingValue;
    currentReviewValue = initialReviewValue;

    // console.log(`Opening rating modal for ${book.title}. Initial rating: ${initialRatingValue}, Initial review: '${initialReviewValue}'`);

    if (ratingModalTitle) ratingModalTitle.textContent = `Rate/Review: ${book.title}`;

    updateInteractiveStarsVisual(currentRatingValue);

    // Setup Review Section
    if (reviewInput) {
        reviewInput.value = currentReviewValue;
        reviewInput.readOnly = true;
        reviewInput.style.display = 'none';
    }
    if (reviewDisplayText) {
        reviewDisplayText.textContent = currentReviewValue || "(No review added yet)";
    }
    if (reviewDisplayArea) {
        reviewDisplayArea.style.display = 'block';
    }
    if (editReviewBtn) {
        editReviewBtn.style.display = 'inline-block';
    }

    updateRatingModalButtons();
    ratingModal.classList.add('visible');
}

function closeRatingModal() {
    if (ratingModal) { ratingModal.classList.remove('visible'); }
    currentRatingBookId = null;
    if (reviewDisplayArea) reviewDisplayArea.style.display = 'block';
    if (editReviewBtn) editReviewBtn.style.display = 'inline-block';
    if (reviewInput) {
        reviewInput.style.display = 'none';
        reviewInput.readOnly = true;
    }
    isRatingInteractionActive = false;
}

function handleRatingCancel() {
    // console.log("Rating Cancel clicked. Reverting changes.");
    // No need to explicitly revert values, just close.
    closeRatingModal();
}

function handleEditReviewClick() {
    if (!reviewInput || !reviewDisplayArea || !editReviewBtn) return;
    // console.log("Edit review button clicked.");
    reviewDisplayArea.style.display = 'none';
    editReviewBtn.style.display = 'none';
    reviewInput.style.display = 'block';
    reviewInput.readOnly = false;
    reviewInput.focus();
    updateRatingModalButtons();
}

function handleRatingSave() {
    if (!currentRatingBookId) { console.error("Save Rating Error: No book ID."); return; }
    const bookIndex = allBooks.findIndex(b => b.id === currentRatingBookId);
    if (bookIndex === -1) { console.error(`Save Rating Error: Book ${currentRatingBookId} not found.`); return; }

    const finalRating = currentRatingValue;
    const finalReview = (reviewInput && !reviewInput.readOnly) ? reviewInput.value : initialReviewValue;

    // console.log(`Saving rating/review for book ${currentRatingBookId}: Rating=${finalRating}, Review='${finalReview}'`);

    allBooks[bookIndex].personalRating = finalRating;
    allBooks[bookIndex].review = finalReview;

    saveBooksToStorage(allBooks);
    renderBooks();
    closeRatingModal();
}

function updateRatingModalButtons() {
    if (!ratingSaveBtn || !ratingCancelBtn || !ratingCloseBtn) return;
    let reviewForComparison = initialReviewValue;
    if (reviewInput && !reviewInput.readOnly) {
        reviewForComparison = reviewInput.value;
    }
    const ratingChanged = parseFloat(currentRatingValue) !== parseFloat(initialRatingValue);
    const reviewChanged = reviewForComparison !== initialReviewValue;
    const hasChanges = ratingChanged || reviewChanged;
    ratingSaveBtn.style.display = hasChanges ? 'inline-block' : 'none';
    ratingCancelBtn.style.display = hasChanges ? 'inline-block' : 'none';
    ratingCloseBtn.style.display = !hasChanges ? 'inline-block' : 'none';
}

// Interactive Star Logic
function updateInteractiveStarsVisual(rating) {
    const stars = document.querySelectorAll('#interactive-stars .rating-star-svg');
    stars.forEach((star, index) => {
        const starRating = index + 1;
        star.classList.remove('filled', 'half-filled');
        if (rating >= starRating) { star.classList.add('filled'); }
        else if (rating >= starRating - 0.5) { star.classList.add('half-filled'); } // Corrected this line
    });
    const ratingValueEl = document.getElementById('rating-value-display');
    if (ratingValueEl) {
        ratingValueEl.textContent = rating > 0 ? `${rating.toFixed(1)} / 5` : '(No Rating)';
    }
}

function calculateRatingFromEvent(event) {
    if (!interactiveStarsContainer) { return currentRatingValue; }
    const starSvgs = interactiveStarsContainer.querySelectorAll('.rating-star-svg');
    if (!starSvgs || starSvgs.length !== 5) { return currentRatingValue; }
    const firstStarRect = starSvgs[0].getBoundingClientRect();
    const lastStarRect = starSvgs[4].getBoundingClientRect();
    const starsAreaLeft = firstStarRect.left;
    const starsAreaRight = lastStarRect.right;
    const starsAreaWidth = starsAreaRight - starsAreaLeft;
    let clientX;
    if (event.touches && event.touches.length > 0) { clientX = event.touches[0].clientX; }
    else if (event.changedTouches && event.changedTouches.length > 0) { clientX = event.changedTouches[0].clientX; }
    else if (event.clientX !== undefined) { clientX = event.clientX; }
    else { return currentRatingValue; }
    const offsetX = clientX - starsAreaLeft;
    const totalStars = 5;
    const clampedOffsetX = Math.max(0, Math.min(starsAreaWidth, offsetX));
    let rawRating = (starsAreaWidth > 0) ? (clampedOffsetX / starsAreaWidth) * totalStars : 0;
    const roundedRating = Math.round(rawRating * 2) / 2;
    return roundedRating;
}

function handleStarInteractionStart(event) {
    isRatingInteractionActive = true;
    const newRating = calculateRatingFromEvent(event);
    if (typeof newRating === 'number') { updateInteractiveStarsVisual(newRating); }
}
function handleStarInteractionMove(event) {
    if (!isRatingInteractionActive) return;
    const newRating = calculateRatingFromEvent(event);
     if (typeof newRating === 'number') { updateInteractiveStarsVisual(newRating); }
}
function handleStarInteractionEnd(event) {
    if (!isRatingInteractionActive) return;
    isRatingInteractionActive = false;
    const finalRating = calculateRatingFromEvent(event);
    if (typeof finalRating === 'number') {
        currentRatingValue = finalRating;
        updateInteractiveStarsVisual(currentRatingValue);
        updateRatingModalButtons();
    } else {
        console.warn("[handleStarInteractionEnd] Final rating calculation failed.");
        updateInteractiveStarsVisual(currentRatingValue); // Revert
    }
}

// --- Search Functions ---
function showSearchModal() {
    if (searchModal) {
        if (searchInput) searchInput.value = '';
        if (searchStatusElement) searchStatusElement.textContent = '';
        searchModal.classList.add('visible');
        if (searchInput) searchInput.focus();
    }
}
function hideSearchModal() { if (searchModal) { searchModal.classList.remove('visible'); } }
function performSearch() {
    if (!searchInput) return;
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        if (searchStatusElement) searchStatusElement.textContent = 'Please enter a search term.';
        searchInput.focus();
        return;
    }
    // console.log(`Performing search for: \"${searchTerm}\"`);
    currentSearchTerm = searchTerm;
    isSearchActive = true;
    if (searchBtn) searchBtn.textContent = 'Clear Search';
    renderBooks();
    hideSearchModal();
}
function clearSearch() {
    // console.log("Clearing search.");
    currentSearchTerm = '';
    isSearchActive = false;
    if (searchInput) searchInput.value = '';
    if (searchBtn) searchBtn.textContent = 'Search';
    renderBooks();
}


// --- API Interaction ---
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const RATE_LIMIT_ERROR = Symbol("RateLimitError");
const GOOGLE_BOOKS_API_KEY = 'AIzaSyAW5CgU1bY1ePTgGyBdNXQZXMhIVz1l0QQ';

async function fetchBookDataByISBN(isbn) {
    const cleanedIsbn = isbn.replace(/[-\s]/g, '');
    const apiKeyParam = GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_API_KEY_HERE' ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
    const url = `${GOOGLE_BOOKS_API_URL}?q=isbn:${cleanedIsbn}&maxResults=1${apiKeyParam}`;
    // console.log(`Fetching from URL: ${url}`);
    try {
        const response = await fetch(url);
        if (response.status === 429) { console.warn("Rate limit hit (429)."); return RATE_LIMIT_ERROR; }
        if (!response.ok) { console.error(`API request failed: ${response.status} ${response.statusText}`); return null; }
        const data = await response.json();
        if (!data.items || data.items.length === 0) { return null; }
        const bookData = data.items[0].volumeInfo;
        let coverImageUrl = '';
        if (bookData.imageLinks) {
            const rawUrl = bookData.imageLinks.thumbnail || bookData.imageLinks.smallThumbnail || '';
            if (rawUrl) { coverImageUrl = rawUrl.startsWith('http:') ? rawUrl.replace(/^http:/, 'https:') : rawUrl; }
        }
        return {
            isbn: cleanedIsbn, title: bookData.title || 'N/A', authors: bookData.authors || [],
            coverImageUrl: coverImageUrl, synopsis: bookData.description || '', publisher: bookData.publisher || '',
            publicationYear: bookData.publishedDate ? bookData.publishedDate.substring(0, 4) : '', pageCount: bookData.pageCount || null,
            apiGenres: bookData.categories || [], apiSeriesTitle: '', apiSeriesNumber: ''
        };
    } catch (error) {
        console.error("Error fetching book data:", error);
        return null;
    }
}

async function handleIsbnLookup() {
    if (!isbnManualInput || !isbnLookupButton) return;
    const isbn = isbnManualInput.value.trim();
    console.log(`[handleIsbnLookup] Starting lookup for ISBN: ${isbn}`); // Log function call
    if (!isbn) { alert("Please enter an ISBN."); return; }
    isbnLookupButton.disabled = true;
    if (lookupStatusElement) lookupStatusElement.textContent = `Looking up ${isbn}...`;
    try {
        const bookData = await fetchBookDataByISBN(isbn);
        // *** ADD LOG HERE to see API result ***
        console.log("[handleIsbnLookup] Data received from fetchBookDataByISBN:", bookData);

        hideIsbnInputModal();
        if (bookData === RATE_LIMIT_ERROR) {
            alert("Lookup failed: Too many requests. Please wait and try again.");
            showIsbnInputModal();
            if (lookupStatusElement) lookupStatusElement.textContent = 'Rate limit exceeded. Try again soon.';
        } else if (bookData) {
            prefillAndShowAddBookForm(bookData);
        } else {
            alert(`Could not find book details for ISBN ${isbn}. You can add the details manually.`);
            console.log("[handleIsbnLookup] No book found via API. Calling showAddBookModal() directly for manual entry."); // Log direct call
            showAddBookModal(); // <<< This call should have skipReset=false
        }
    } catch (error) {
        console.error("Error during ISBN lookup process:", error);
        alert("An unexpected error occurred during lookup.");
        hideIsbnInputModal();
    } finally {
        isbnLookupButton.disabled = false;
    }
}

// --- Form Handling & Validation ---
function validateFormAndToggleButtonState(highlight = false) {
    if (!addBookForm || !saveBookBtn) return;
    console.log('[validateForm] Running validation. Highlight:', highlight);
    const requiredFields = addBookForm.querySelectorAll('[required]');
    let isFormValid = true;
    const validatedRadioGroups = new Set();
    requiredFields.forEach(field => {
        let isFieldValid = true;
        const fieldIdentifier = field.id || field.name;
        const formGroup = field.closest('.form-group, fieldset');
        if (field.type === 'radio') {
            const radioGroupName = field.name;
            if (validatedRadioGroups.has(radioGroupName)) return; // Check group only once
            validatedRadioGroups.add(radioGroupName);
            const fieldset = field.closest('fieldset');
            isFieldValid = !!addBookForm.querySelector(`input[name="${radioGroupName}"]:checked`);
            console.log(`[validateForm] Checking Radio Group: ${radioGroupName}, Valid: ${isFieldValid}`);
            if (highlight && fieldset) { fieldset.classList.toggle('input-error', !isFieldValid); }
            else if(fieldset) { fieldset.classList.remove('input-error'); }
        } else if (field.type === 'text' || field.type === 'number' || field.tagName === 'TEXTAREA') {
            isFieldValid = !!field.value.trim();
            console.log(`[validateForm] Checking Field: ${fieldIdentifier}, Value: "${field.value}", Valid: ${isFieldValid}`);
             if (highlight && formGroup) { formGroup.classList.toggle('input-error', !isFieldValid); }
             else if (formGroup) { formGroup.classList.remove('input-error'); }
        }
        // Add checks for other required types if necessary

        if (!isFieldValid) {
            console.log(`[validateForm] Field ${fieldIdentifier} marked as INVALID.`);
            isFormValid = false;
        }
    });
    console.log('[validateForm] Overall form validity:', isFormValid);
    saveBookBtn.classList.toggle('btn-save-ready', isFormValid);
    saveBookBtn.classList.toggle('btn-check-fields', !isFormValid);
    // Explicitly enable/disable based on validity
    // REMOVE THE LINE BELOW:
    // saveBookBtn.disabled = !isFormValid;
}

function detectSeriesInfoFromTitle(bookTitle) {
    const knownSeries = loadSeriesTitles();
    let detectedSeries = { seriesTitle: null, seriesNumber: null };
    if (!bookTitle || knownSeries.length === 0) return detectedSeries;
    const lowerBookTitle = bookTitle.toLowerCase();
    let bestMatch = null;
    knownSeries.sort((a, b) => b.length - a.length).forEach(series => {
        if (!bestMatch && lowerBookTitle.includes(series.toLowerCase())) bestMatch = series;
    });
    if (bestMatch) {
        detectedSeries.seriesTitle = bestMatch;
        const matchEndIndex = lowerBookTitle.indexOf(bestMatch.toLowerCase()) + bestMatch.length;
        const followingSubstring = bookTitle.substring(matchEndIndex);
        const numberRegex = /^\s*[:#\(-\/]?\s*(\d+)\b/;
        const numberMatch = followingSubstring.match(numberRegex);
        if (numberMatch && numberMatch[1]) detectedSeries.seriesNumber = numberMatch[1];
    }
    return detectedSeries;
}

function prefillAndShowAddBookForm(apiData) {
    if (!addBookForm || !formCoverPreview || !apiGenresDisplay || !removeCustomCoverBtn) {
        console.error("Required elements for prefilling not found.");
        return;
    }
    console.log("[Prefill] Starting prefill with data:", apiData);

    // Clear existing form and state BEFORE prefilling
    addBookForm.reset();
    currentlyFetchedApiData = apiData; // Store fetched data
    selectedCoverImageDataUrl = null; // Reset user image
    customCoverRemoved = false;
    formCoverPreview.src = 'placeholder-cover.png'; // Reset preview
    formCoverPreview.classList.add('placeholder');
    formCoverPreview.classList.remove('custom-cover');
    removeCustomCoverBtn.style.display = 'none';
    apiGenresDisplay.innerHTML = ''; // Clear previous API genres

    // Helper to set value safely
    const setVal = (selector, value) => {
        const el = addBookForm.querySelector(selector);
        if (el && value !== undefined && value !== null) {
            el.value = value;
            console.log(`[Prefill] Set ${selector} to: ${value}`);
        } else if (el) {
             el.value = ''; // Ensure field is cleared if value is null/undefined
             console.log(`[Prefill] Cleared ${selector} as value was null/undefined.`);
        } else {
            console.warn(`[Prefill] Element not found for selector: ${selector}`);
        }
    };

    // Prefill basic fields
    setVal('#title', apiData.title); // Corrected selector
    setVal('#authors', apiData.authors ? apiData.authors.join(', ') : ''); // Corrected selector
    // --- Special handling for Synopsis ---
    const synopsisValue = apiData.synopsis || '';
    const synopsisTextArea = addBookForm.querySelector('#synopsis-edit-input');
    const synopsisDisplayP = addBookForm.querySelector('#synopsis-display-text');
    const synopsisDisplayArea = addBookForm.querySelector('.synopsis-display-area');

    if (synopsisTextArea) {
        synopsisTextArea.value = synopsisValue;
        synopsisTextArea.style.display = 'none'; // Ensure textarea is hidden initially
        console.log('[Prefill] Set #synopsis-edit-input value.');
    }
    if (synopsisDisplayP) {
        synopsisDisplayP.textContent = synopsisValue || '(Synopsis not available)'; // Set visible text
        console.log('[Prefill] Set #synopsis-display-text content.');
    }
    if (synopsisDisplayArea) {
        synopsisDisplayArea.style.display = 'block'; // Ensure display area is visible
    }
    // --- End Synopsis Handling ---
    setVal('#publisher', apiData.publisher);
    setVal('#publicationYear', apiData.publicationYear);
    setVal('#userPageCount', apiData.pageCount); // Corrected selector
    setVal('#isbn', apiData.isbn); // Prefill ISBN used for lookup

    // Handle Cover Image
    if (apiData.coverImageUrl) {
        formCoverPreview.src = apiData.coverImageUrl;
        formCoverPreview.classList.remove('placeholder');
        formCoverPreview.classList.add('api-cover'); // Indicate it's from API
        formCoverPreview.style.display = 'block'; // <-- ADD THIS LINE TO SHOW THE IMAGE
        console.log(`[Prefill] Set cover preview src to: ${apiData.coverImageUrl}`);
    } else {
        formCoverPreview.src = 'placeholder-cover.png';
        formCoverPreview.classList.add('placeholder');
         formCoverPreview.classList.remove('api-cover');
         formCoverPreview.style.display = 'none'; // <-- Ensure it's hidden if no cover
        console.log("[Prefill] No cover image URL found, using placeholder.");
    }

    // Display API Genres (read-only)
    if (apiData.apiGenres && apiData.apiGenres.length > 0) {
        apiGenresDisplay.innerHTML = `<strong>API Genres:</strong> ${apiData.apiGenres.join(', ')}`;
        console.log(`[Prefill] Displayed API genres: ${apiData.apiGenres.join(', ')}`);
    } else {
         apiGenresDisplay.innerHTML = '';
         console.log("[Prefill] No API genres found.");
    }

    // Try to auto-detect series info from title (if not provided by API)
    if (!apiData.apiSeriesTitle) {
        const detectedSeries = detectSeriesInfoFromTitle(apiData.title);
        if (detectedSeries.title) {
            setVal('#userSeriesTitle', detectedSeries.title);
            if (detectedSeries.number) {
                setVal('#userSeriesNumber', detectedSeries.number);
            }
        }
    } else {
        // If API provided series info, prefill the user fields as a starting point
        setVal('#userSeriesTitle', apiData.apiSeriesTitle);
        setVal('#userSeriesNumber', apiData.apiSeriesNumber);
    }


    // Set default status to 'To Read' if not set
    if (!addBookForm.querySelector('input[name="status"]:checked')) {
        const toReadRadio = addBookForm.querySelector('input[name="status"][value="To Read"]');
        if (toReadRadio) {
            toReadRadio.checked = true;
            console.log("[Prefill] Set default status to 'To Read'.");
        }
    }

    // Show the modal, skip reset, and set title
    // Corrected call: Pass 'true' for skipReset
    showAddBookModal(true, "Confirm / Add Book Details");

    // Validate after prefilling, but don't highlight errors yet
    validateFormAndToggleButtonState(false); // <-- CHANGED TO false
    console.log("[Prefill] Prefill complete, modal shown.");
}

function startEditBook(bookId) {
    // console.log(`Starting edit for book ID: ${bookId}`);
    const bookToEdit = allBooks.find(b => b.id === bookId);
    if (!bookToEdit) { console.error(`Edit Error: Book ${bookId} not found.`); alert("Error: Book not found."); return; }
    currentlyEditingBookId = bookId;
    currentlyFetchedApiData = null;
    selectedCoverImageDataUrl = null; // Reset selected cover image for edit mode initially
    customCoverRemoved = false; // Reset flag
    if (!addBookForm) return;
    addBookForm.reset();
    console.log(`[startEditBook] Editing book: ${bookToEdit.title}`);
    console.log(`[startEditBook] Existing userCoverImage:`, bookToEdit.userCoverImage ? `Present (length ${bookToEdit.userCoverImage.length})` : 'Absent');
    const setVal = (selector, value) => { const el = addBookForm.querySelector(selector); if (el) el.value = value ?? ''; };
    const setRadio = (name, value) => { const el = addBookForm.querySelector(`input[name="${name}"][value="${value}"]`); if (el) el.checked = true; };
    setVal('#title', bookToEdit.title);
    setVal('#authors', bookToEdit.authors.join(', '));
    setVal('#isbn', bookToEdit.isbn);
    setVal('#publicationYear', bookToEdit.publicationYear);
    setVal('#publisher', bookToEdit.publisher);
    
    // Get synopsis elements from the form
    const synopsisTextArea = addBookForm.querySelector('#synopsis-edit-input');
    const synopsisDisplayText = addBookForm.querySelector('#synopsis-display-text');
    const synopsisDisplayArea = addBookForm.querySelector('.synopsis-display-area');
    
    // Set synopsis value and display
    const synopsisValue = bookToEdit.synopsis || '';
    if (synopsisDisplayText) synopsisDisplayText.textContent = synopsisValue;
    if (synopsisTextArea) synopsisTextArea.value = synopsisValue;
    if (synopsisDisplayArea) synopsisDisplayArea.style.display = '';
    if (synopsisTextArea) synopsisTextArea.style.display = 'none';
    
    setRadio('reader', bookToEdit.reader);
    setRadio('status', bookToEdit.status);
    setVal('#dateFinished', bookToEdit.dateFinished);
    setVal('#tags', bookToEdit.customTags.join(', '));
    setVal('#userSeriesTitle', bookToEdit.userSeriesTitle);
    setVal('#userSeriesNumber', bookToEdit.userSeriesNumber);
    setVal('#userPageCount', bookToEdit.userPageCount);
    const apiGenresInput = addBookForm.querySelector('#api-genres-input');
    const apiGenresDiv = apiGenresInput?.closest('.form-group');
    if (apiGenresDiv) apiGenresDiv.style.display = 'block';
    setVal('#api-genres-input', (bookToEdit.apiGenres || []).join(', '));

    // Set the preview for existing user cover or API cover
    if (formCoverPreview) {
        if (bookToEdit.userCoverImage) {
            formCoverPreview.src = bookToEdit.userCoverImage;
            formCoverPreview.onerror = () => { formCoverPreview.src = 'placeholder-cover.png'; };
            formCoverPreview.style.display = 'block';
        } else if (bookToEdit.coverImageUrl) {
            formCoverPreview.src = bookToEdit.coverImageUrl;
            formCoverPreview.onerror = () => { formCoverPreview.src = 'placeholder-cover.png'; };
            formCoverPreview.style.display = 'block';
        } else {
             formCoverPreview.src = '#';
             formCoverPreview.style.display = 'none';
        }
    }

    // Show/hide remove button based on existing user cover
    if (removeCustomCoverBtn) {
        console.log(`[startEditBook] Checking visibility for remove button. Has user cover: ${!!bookToEdit.userCoverImage}`);
        if (bookToEdit.userCoverImage) {
            removeCustomCoverBtn.style.display = 'inline-block';
            removeCustomCoverBtn.disabled = false;
            console.log(`[startEditBook] Set remove button display to: ${removeCustomCoverBtn.style.display}`);
        } else {
            removeCustomCoverBtn.style.display = 'none';
            removeCustomCoverBtn.disabled = true;
            console.log(`[startEditBook] Set remove button display to: ${removeCustomCoverBtn.style.display}`);
        }
    } else {
        console.error('[startEditBook] removeCustomCoverBtn variable is not defined here!');
    }

    hideBookDetailModal();
    showAddBookModal(true, "Edit Book Details");
}

// Function to update file name display
function updateFileNameDisplay() {
    const fileInput = document.getElementById('userCoverImage');
    const fileNameDisplay = document.getElementById('file-name-display');
    
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                fileNameDisplay.textContent = fileInput.files[0].name;
            } else {
                fileNameDisplay.textContent = 'No file chosen';
            }
        });
    }
}

// Modified function to ensure the form submit button works
function handleAddBookSubmit(event) {
    event.preventDefault();
    
    console.log("Form submission started");
    
    // Make sure the form is valid
    if (!addBookForm.checkValidity()) {
        addBookForm.reportValidity();
        return;
    }
    
    const formData = new FormData(addBookForm);
    
    // Get values from form
    const getValue = (key, defaultValue = '') => formData.get(key) || defaultValue;
    const getNumberValue = (key, defaultValue = null) => { 
        const val = formData.get(key); 
        return (val !== null && val !== '' && !isNaN(val)) ? parseFloat(val) : defaultValue; 
    };
    const getArrayValue = (inputId) => { 
        const el = addBookForm.querySelector(`#${inputId}`); 
        return el && el.value ? el.value.split(',').map(s => s.trim()).filter(Boolean) : []; 
    };
    
    // Get form data
    const title = getValue('title');
    const authorsString = getValue('authors');
    const isbn = getValue('isbn');
    const publisher = getValue('publisher');
    const publicationYear = getValue('publicationYear');
    const status = getValue('status');
    const reader = getValue('reader');
    const userPageCount = getNumberValue('userPageCount');
    const dateFinished = getValue('dateFinished');
    const userSeriesTitle = getValue('userSeriesTitle');
    const userSeriesNumber = getValue('userSeriesNumber');
    const tagsArray = getArrayValue('tags');
    const synopsis = getValue('synopsis');
    
    // Process the authors string
    const authors = authorsString.split(',').map(author => author.trim()).filter(Boolean);
    
    if (title === '' || authors.length === 0) {
        alert('Title and Author are required!');
        return;
    }
    
    // Prepare the book object
    let saveData = {
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
        synopsis
    };
    
    // Add date finished if appropriate status
    if (status === 'Finished' && dateFinished) {
        saveData.dateFinished = dateFinished;
    }
    
    // Handle existing book if editing
    if (currentlyEditingBookId) {
        const existingBookIndex = allBooks.findIndex(book => book.id === currentlyEditingBookId);
        if (existingBookIndex !== -1) {
            // Keep original data that's not in the form
            const originalBook = allBooks[existingBookIndex];
            saveData = {
                ...originalBook,
                ...saveData,
                id: originalBook.id
            };
            
            // Update the book array
            allBooks[existingBookIndex] = new BookV2(
                saveData.isbn, saveData.title, saveData.authors, 
                saveData.coverImageUrl, saveData.synopsis,
                saveData.publisher, saveData.publicationYear, saveData.pageCount, 
                saveData.apiGenres, saveData.apiSeriesTitle, saveData.apiSeriesNumber,
                saveData.reader, saveData.status, saveData.personalRating,
                saveData.dateAdded, saveData.dateFinished, saveData.customTags,
                saveData.userSeriesTitle, saveData.userSeriesNumber, saveData.userPageCount,
                customCoverRemoved ? null : (selectedCoverImageDataUrl || saveData.userCoverImage),
                saveData.review
            );
        }
    } else {
        // Add a new book
        allBooks.push(new BookV2(
            saveData.isbn, saveData.title, saveData.authors, 
            currentlyFetchedApiData?.coverImageUrl || '', saveData.synopsis,
            saveData.publisher, saveData.publicationYear, 
            currentlyFetchedApiData?.pageCount || null, 
            currentlyFetchedApiData?.genres || [], 
            currentlyFetchedApiData?.seriesTitle || '', 
            currentlyFetchedApiData?.seriesNumber || '',
            saveData.reader, saveData.status, null, // No rating for new books
            new Date().toISOString(), // Current date
            saveData.dateFinished, // Date finished if provided
            saveData.customTags, saveData.userSeriesTitle, saveData.userSeriesNumber, 
            saveData.userPageCount, selectedCoverImageDataUrl, // User cover
            '' // No review for new books
        ));
    }
    
    // Update storage with new/edited book
    saveBooksToStorage(allBooks);
    
    // Reset form and state
    currentlyEditingBookId = null;
    currentlyFetchedApiData = null; 
    selectedCoverImageDataUrl = null;
    customCoverRemoved = false;
    
    // Hide the form modal
    hideAddBookModal();
    
    // Re-render the book display
    renderBooks();
}

// --- Data Reset ---
function resetAllData() {
    if (confirm("Are you sure you want to reset all bookshelf data? This cannot be undone.")) {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(SERIES_STORAGE_KEY);
            allBooks = [];
            currentlyFetchedApiData = null; currentlyEditingBookId = null;
            isSearchActive = false; currentSearchTerm = ''; isWishlistViewActive = false;
            if(searchBtn) searchBtn.textContent = 'Search';
            if(wishlistBtn) { wishlistBtn.textContent = 'Wishlist'; wishlistBtn.classList.remove('active'); }
            renderBooks();
            populateSeriesDatalist();
            alert("Bookshelf data has been reset.");
        } catch (error) { console.error("Error clearing data:", error); alert("An error occurred resetting data."); }
    }
}


// --- Filter Modal Functions ---
function showFilterModal() {
    if (!filterModal || !filterForm) return;
    // Reset form to current active filters before showing
    // Statuses
    filterForm.querySelectorAll('input[name="filter-status"]').forEach(cb => {
        cb.checked = activeFilters.status.includes(cb.value);
    });
    // Readers
    filterForm.querySelectorAll('input[name="filter-reader"]').forEach(cb => {
        cb.checked = activeFilters.reader.includes(cb.value);
    });
    // Rating
    const ratingVal = activeFilters.targetRating.toString();
    const ratingRadio = filterForm.querySelector(`input[name="filter-rating"][value="${ratingVal}"]`);
    if (ratingRadio) ratingRadio.checked = true;
    else { // Default to 'Any'
        const anyRadio = filterForm.querySelector('input[name="filter-rating"][value="0"]');
        if (anyRadio) anyRadio.checked = true;
    }

    // Sync the sort select in the filter modal with the current sort
    const filterSortSelect = document.getElementById('filter-sort-select');
    if (filterSortSelect) {
        filterSortSelect.value = `${currentSort.field}_${currentSort.direction}`;
    }

    filterModal.classList.add('visible');
}

function hideFilterModal() {
    if (filterModal) filterModal.classList.remove('visible');
}

function handleApplyFilters() {
    if (!filterForm) return;
    console.log("Applying filters...");

    // Get sort value from filter modal
    const filterSortSelect = document.getElementById('filter-sort-select');
    if (filterSortSelect) {
        const selectedValue = filterSortSelect.value;
        const [field, direction] = selectedValue.split('_');
        
        if (field && direction) {
            currentSort = { field, direction };
        }
    }

    // Read selected values
    const selectedStatuses = Array.from(filterForm.querySelectorAll('input[name="filter-status"]:checked')).map(cb => cb.value);
    const selectedReaders = Array.from(filterForm.querySelectorAll('input[name="filter-reader"]:checked')).map(cb => cb.value);
    const selectedRatingInput = filterForm.querySelector('input[name="filter-rating"]:checked');
    const selectedTargetRating = selectedRatingInput ? parseInt(selectedRatingInput.value, 10) : 0;

    // Update global filter state
    activeFilters = {
        status: selectedStatuses,
        reader: selectedReaders,
        targetRating: selectedTargetRating
    };

    // Determine if any filters are actually active
    isFilterActive = activeFilters.status.length > 0 ||
                     activeFilters.reader.length > 0 ||
                     activeFilters.targetRating !== 0;

    renderBooks(); // Re-render with new filters
    hideFilterModal();
}

function handleClearFilters() {
    console.log("Clearing filters...");
    // Reset global state
    activeFilters = { status: [], reader: [], targetRating: 0 };
    isFilterActive = false;

    // Reset form elements
    if (filterForm) {
        filterForm.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        const anyRadio = filterForm.querySelector('input[name="filter-rating"][value="0"]');
        if (anyRadio) anyRadio.checked = true;
    }

    // Reset sort to default
    currentSort = { field: 'dateAdded', direction: 'desc' };
    
    // Update filter sort select
    const filterSortSelect = document.getElementById('filter-sort-select');
    if (filterSortSelect) {
        filterSortSelect.value = 'dateAdded_desc';
    }

    renderBooks(); // Re-render without filters
    hideFilterModal();
}

// --- Sort Handler ---
function handleSortChange(event) {
    const selectedValue = event.target.value;
    const [field, direction] = selectedValue.split('_');

    if (field && direction) {
        currentSort = { field, direction };
        console.log(`Sort changed to: ${field} ${direction}`);
        renderBooks(); // Re-render with new sort order
    }
}

// --- View Selection ---
function setView(viewType) {
    // Update the current view
    currentView = viewType;
    
    // Update the active button state
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const coversViewBtn = document.getElementById('covers-view-btn');
    
    if (gridViewBtn) gridViewBtn.classList.toggle('active', viewType === 'grid');
    if (listViewBtn) listViewBtn.classList.toggle('active', viewType === 'list');
    if (coversViewBtn) coversViewBtn.classList.toggle('active', viewType === 'covers');
    
    // Re-render the books with the new view
    renderBooks();
}

// --- Document Ready --- //
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing app...");
    
    // Initialize dark mode from saved preference
    updateDarkModeUI();
    
    // --- UI Elements (Assignment) ---
    bookDisplayArea = document.getElementById('book-display-area');
    // Remove viewToggleButton reference as we now have separate view buttons
    isbnInputContainer = document.getElementById('isbn-input-container');
    isbnManualInput = document.getElementById('isbn-manual-input');
    isbnLookupButton = document.getElementById('isbn-lookup-btn');
    cancelIsbnInputButton = document.getElementById('cancel-isbn-input-btn');
    lookupStatusElement = document.getElementById('isbn-lookup-status');
    seriesTitlesDatalist = document.getElementById('series-titles-list');
    addBookFormContainer = document.getElementById('add-book-form-container');
    addBookForm = document.getElementById('add-book-form');
    cancelAddBookButton = document.getElementById('cancel-add-book-btn');
    addBookFormTitle = document.getElementById('add-book-form-title');
    resetDataButton = document.getElementById('reset-data-btn');
    searchModal = document.getElementById('search-modal');
    searchInput = document.getElementById('search-input');
    searchSubmitBtn = document.getElementById('search-submit-btn');
    searchCancelBtn = document.getElementById('search-cancel-btn');
    searchStatusElement = document.getElementById('search-status');
    filterModal = document.getElementById('filter-modal');
    filterForm = document.getElementById('filter-form');
    filterApplyBtn = document.getElementById('filter-apply-btn');
    filterClearBtn = document.getElementById('filter-clear-btn');
    filterCancelBtn = document.getElementById('filter-cancel-btn');
    
    // Book Detail Modal Elements
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
    detailGenres = document.getElementById('detail-genres');
    detailTags = document.getElementById('detail-tags');
    detailSynopsis = document.getElementById('detail-synopsis');
    detailPageCount = document.getElementById('detail-page-count');
    detailPublisher = document.getElementById('detail-publisher');
    detailPublicationYear = document.getElementById('detail-publication-year');
    detailIsbn = document.getElementById('detail-isbn');
    editBookBtn = document.getElementById('edit-book-btn');
    closeDetailBtn = document.getElementById('close-detail-btn');
    deleteBookBtn = document.getElementById('delete-book-btn');
    synopsisDisplayText = document.getElementById('synopsis-display-text');
    editSynopsisBtn = document.getElementById('edit-synopsis-btn');
    synopsisEditInput = document.getElementById('synopsis-edit-input');
    detailReviewSection = document.getElementById('detail-review-section');
    detailReviewText = document.getElementById('detail-review-text');
    
    // Rating Modal Elements
    ratingModal = document.getElementById('rating-review-modal');
    ratingModalTitle = document.getElementById('rating-modal-title');
    interactiveStarsContainer = document.getElementById('interactive-stars');
    ratingValueDisplay = document.getElementById('rating-value-display');
    reviewSection = document.getElementById('review-section');
    reviewDisplayArea = document.getElementById('review-display-area');
    reviewDisplayText = document.getElementById('review-display-text');
    editReviewBtn = document.getElementById('edit-review-btn');
    reviewInput = document.getElementById('review-input');
    ratingCancelBtn = document.getElementById('rating-cancel-btn');
    ratingSaveBtn = document.getElementById('rating-save-btn');
    ratingCloseBtn = document.getElementById('rating-close-btn');
    
    // Add Book Form Elements
    formCoverPreview = document.getElementById('form-cover-preview');
    apiGenresDisplay = document.getElementById('api-genres-display');
    formApiGenres = document.getElementById('api-genres-input');
    saveBookBtn = document.getElementById('save-book-btn');
    removeCustomCoverBtn = document.getElementById('remove-custom-cover-btn');
    addManuallyBtn = document.getElementById('add-manually-btn');
    
    // --- Bottom Navigation Bar Elements ---
    const homeNavBtn = document.getElementById('home-nav-btn');
    const addNavBtn = document.getElementById('add-nav-btn');
    const searchNavBtn = document.getElementById('search-nav-btn');
    searchBtn = searchNavBtn; // Set searchBtn to reference searchNavBtn
    const wishlistNavBtn = document.getElementById('wishlist-nav-btn');
    wishlistBtn = wishlistNavBtn; // Set wishlistBtn to reference wishlistNavBtn
    const filterNavBtn = document.getElementById('filter-nav-btn');
    filterBtn = filterNavBtn; // Set filterBtn to reference filterNavBtn

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    // --- Event Listeners ---
    
    // View buttons
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const coversViewBtn = document.getElementById('covers-view-btn');
    
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setView('grid'));
    if (listViewBtn) listViewBtn.addEventListener('click', () => setView('list'));
    if (coversViewBtn) coversViewBtn.addEventListener('click', () => setView('covers'));
    
    // Dark mode button
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) darkModeBtn.addEventListener('click', toggleDarkMode);
    
    // Settings Button and Modal
    if (settingsBtn) settingsBtn.addEventListener('click', showSettingsModal);
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', hideSettingsModal);
    if (exportBtn) exportBtn.addEventListener('click', exportBooksToCSV);
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            if (importFileInput) importFileInput.click();
        });
    }
    if (importFileInput) {
        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                importBooksFromCSV(file);
            }
        });
    }
    
    // Reset data button
    if (resetDataButton) resetDataButton.addEventListener('click', resetAllData);
    
    // Search modal
    if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', performSearch);
    if (searchCancelBtn) searchCancelBtn.addEventListener('click', hideSearchModal);
    
    // Filter functionality
    if (filterApplyBtn) filterApplyBtn.addEventListener('click', handleApplyFilters);
    if (filterClearBtn) filterClearBtn.addEventListener('click', handleClearFilters);
    if (filterCancelBtn) filterCancelBtn.addEventListener('click', hideFilterModal);
    
    // Only use filter-sort-select for sorting
    const filterSortSelect = document.getElementById('filter-sort-select');
    sortSelect = filterSortSelect;
    if (filterSortSelect) {
        filterSortSelect.value = `${currentSort.field}_${currentSort.direction}`;
    }
    
    // ISBN input modal
    if (isbnLookupButton) isbnLookupButton.addEventListener('click', handleIsbnLookup);
    if (cancelIsbnInputButton) cancelIsbnInputButton.addEventListener('click', hideIsbnInputModal);
    if (addManuallyBtn) addManuallyBtn.addEventListener('click', () => {
        hideIsbnInputModal();
        showAddBookModal(false);
    });
    
    // Add book form
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBookSubmit);
        
        // Make sure clicking the save button triggers form submission
        if (saveBookBtn) {
            saveBookBtn.addEventListener('click', function() {
                console.log("Save button clicked");
                // Check form validity before submitting
                if (addBookForm.checkValidity()) {
                    handleAddBookSubmit(new Event('submit'));
                } else {
                    addBookForm.reportValidity();
                }
            });
        }
        
        // Initialize file name display updater
        updateFileNameDisplay();
    }
    
    if (saveBookBtn) {
        saveBookBtn.addEventListener('click', (event) => {
            if (saveBookBtn.classList.contains('btn-check-fields')) {
                validateFormAndToggleButtonState(true);
                event.preventDefault();
            }
        });
    }
    
    if (cancelAddBookButton) cancelAddBookButton.addEventListener('click', hideAddBookModal);
    
    // Book detail modal
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', hideBookDetailModal);
    if (editBookBtn) {
        editBookBtn.addEventListener('click', () => {
            if (detailModalBookId) {
                startEditBook(detailModalBookId);
            }
        });
    }
    if (deleteBookBtn) {
        deleteBookBtn.addEventListener('click', () => {
            if (detailModalBookId) {
                handleDeleteBook(detailModalBookId);
            }
        });
    }
    
    // Rating modal
    if (ratingCancelBtn) ratingCancelBtn.addEventListener('click', handleRatingCancel);
    if (ratingCloseBtn) ratingCloseBtn.addEventListener('click', closeRatingModal);
    if (ratingSaveBtn) ratingSaveBtn.addEventListener('click', handleRatingSave);
    if (editReviewBtn) editReviewBtn.addEventListener('click', handleEditReviewClick);
    if (reviewInput) reviewInput.addEventListener('input', updateRatingModalButtons);
    if (interactiveStarsContainer) {
        interactiveStarsContainer.addEventListener('mousedown', handleStarInteractionStart);
        interactiveStarsContainer.addEventListener('mousemove', handleStarInteractionMove);
        interactiveStarsContainer.addEventListener('mouseup', handleStarInteractionEnd);
        interactiveStarsContainer.addEventListener('mouseleave', handleStarInteractionEnd);
        interactiveStarsContainer.addEventListener('touchstart', handleStarInteractionStart, { passive: true });
        interactiveStarsContainer.addEventListener('touchmove', handleStarInteractionMove, { passive: true });
        interactiveStarsContainer.addEventListener('touchend', handleStarInteractionEnd);
    }
    
    // User cover upload
    const userCoverInput = addBookForm?.querySelector('#userCoverImage');
    if (userCoverInput && formCoverPreview) {
        userCoverInput.addEventListener('change', (event) => {
            const file = event.target.files ? event.target.files[0] : null;
            if (file) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    if (loadEvent.target && typeof loadEvent.target.result === 'string') {
                        selectedCoverImageDataUrl = loadEvent.target.result;
                        formCoverPreview.src = selectedCoverImageDataUrl;
                        formCoverPreview.style.display = 'block';
                        if (removeCustomCoverBtn) {
                            customCoverRemoved = false;
                            removeCustomCoverBtn.style.display = 'inline-block';
                            removeCustomCoverBtn.disabled = false;
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeCustomCoverBtn) {
        removeCustomCoverBtn.addEventListener('click', handleRemoveCustomCover);
    }
    
    // Function to set active bottom nav button
    function setActiveNavButton(buttonId) {
        // Remove active class from all buttons
        document.querySelectorAll('.bottom-nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        // Add active class to the clicked button
        document.getElementById(buttonId).classList.add('active');
    }
    
    // Bottom Nav Event Listeners
    if (homeNavBtn) {
        homeNavBtn.addEventListener('click', function() {
            setActiveNavButton('home-nav-btn');
            clearSearch();
            isWishlistViewActive = false;
            renderBooks();
        });
    }
    
    if (addNavBtn) {
        addNavBtn.addEventListener('click', function() {
            setActiveNavButton('add-nav-btn');
            showIsbnInputModal();
        });
    }
    
    if (searchNavBtn) {
        searchNavBtn.addEventListener('click', function() {
            setActiveNavButton('search-nav-btn');
            showSearchModal();
        });
    }
    
    if (wishlistNavBtn) {
        wishlistNavBtn.addEventListener('click', function() {
            setActiveNavButton('wishlist-nav-btn');
            isWishlistViewActive = true;
            renderBooks();
        });
    }
    
    if (filterNavBtn) {
        filterNavBtn.addEventListener('click', function() {
            setActiveNavButton('filter-nav-btn');
            showFilterModal();
        });
    }

    // --- Book Data Loading & Initial Render ---
    allBooks = loadBooksFromStorage();
    populateSeriesDatalist();
    renderBooks();

    // Initialize the barcode scanner
    initBarcodeScanner();
});

// --- Re-add Handler for Removing Custom Cover ---
function handleRemoveCustomCover() {
    console.log("Remove Custom Cover button clicked."); // Log click
    customCoverRemoved = true;
    selectedCoverImageDataUrl = null;

    const userCoverInput = addBookForm?.querySelector('#userCoverImage');
    if (userCoverInput) {
        userCoverInput.value = null; // Clear the file input visually
        console.log("Cleared file input value.");
    }

    // Determine the fallback image
    let fallbackCoverUrl = null;
    const originalBookData = currentlyEditingBookId ? allBooks.find(b => b.id === currentlyEditingBookId) : null;
    if (originalBookData?.coverImageUrl) {
        fallbackCoverUrl = originalBookData.coverImageUrl;
        console.log("Found original API cover URL as fallback.");
    } else if (currentlyFetchedApiData?.coverImageUrl) {
        fallbackCoverUrl = currentlyFetchedApiData.coverImageUrl;
        console.log("Found fetched API cover URL as fallback.");
    } else {
        console.log("No fallback cover URL found.");
    }

    // Update the preview
    if (formCoverPreview) {
        if (fallbackCoverUrl) {
            formCoverPreview.src = fallbackCoverUrl;
            formCoverPreview.onerror = () => { formCoverPreview.src = 'placeholder-cover.png'; };
            formCoverPreview.style.display = 'block';
            console.log(`Set preview to fallback: ${fallbackCoverUrl}`);
        } else {
            formCoverPreview.src = '#';
            formCoverPreview.style.display = 'none';
            console.log("Hid preview (no fallback).");
        }
    }

    // Hide/disable the remove button itself
    if (removeCustomCoverBtn) {
        removeCustomCoverBtn.style.display = 'none';
        removeCustomCoverBtn.disabled = true;
        console.log("Hid and disabled the remove button.");
    }
}

// --- Placeholder Delete Function ---
function handleDeleteBook(bookId) {
    const bookIndex = allBooks.findIndex(b => b.id === bookId);
    if (bookIndex === -1) {
        console.error(`[handleDeleteBook] Error: Book with ID ${bookId} not found.`);
        alert("Error: Could not find the book to delete.");
        return;
    }

    const bookTitle = allBooks[bookIndex].title;

    // 1. Confirm Deletion
    if (confirm(`Are you sure you want to permanently delete "${bookTitle}"? This cannot be undone.`)) {
        console.log(`[handleDeleteBook] User confirmed deletion for book ID: ${bookId} (${bookTitle})`);

        // 2. Remove the book from the array
        allBooks.splice(bookIndex, 1);
        console.log(`[handleDeleteBook] Book removed from allBooks array.`);

        // 3. Save the updated array to storage
        saveBooksToStorage(allBooks);
        console.log(`[handleDeleteBook] Updated book list saved to storage.`);

        // 4. Update UI
        hideBookDetailModal(); // Close the detail modal
        renderBooks(); // Re-render the book list
        console.log(`[handleDeleteBook] Modal closed and book list re-rendered.`);

        alert(`"${bookTitle}" has been deleted.`); // Optional confirmation message
    } else {
        console.log(`[handleDeleteBook] User cancelled deletion for book ID: ${bookId}`);
    }
}

// Dark mode functionality
let darkModeEnabled = localStorage.getItem('darkMode') === 'true';

function toggleDarkMode() {
    darkModeEnabled = !darkModeEnabled;
    updateDarkModeUI();
    localStorage.setItem('darkMode', darkModeEnabled);
}

function updateDarkModeUI() {
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-btn')?.classList.add('active');
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('dark-mode-btn')?.classList.remove('active');
    }
}

// Export books data to CSV
function exportBooksToCSV() {
    const books = loadBooksFromStorage();
    if (!books || books.length === 0) {
        alert('No books to export.');
        return;
    }

    // Define CSV headers (all possible fields)
    const headers = [
        'id', 'isbn', 'title', 'authors', 'coverImageUrl', 'synopsis',
        'publisher', 'publicationYear', 'pageCount', 'apiGenres',
        'apiSeriesTitle', 'apiSeriesNumber', 'reader', 'status',
        'personalRating', 'dateAdded', 'dateFinished', 'customTags',
        'userSeriesTitle', 'userSeriesNumber', 'userPageCount', 'userCoverImage',
        'review'
    ];

    // Convert books to CSV format
    let csvContent = headers.join(',') + '\n';
    
    books.forEach(book => {
        const row = headers.map(header => {
            let value = book[header];
            
            // Handle arrays and objects
            if (Array.isArray(value)) {
                value = JSON.stringify(value).replace(/"/g, '""');
            } else if (value && typeof value === 'object') {
                value = JSON.stringify(value).replace(/"/g, '""');
            }
            
            // Convert null/undefined to empty string
            if (value === null || value === undefined) {
                value = '';
            }
            
            // Escape commas and quotes
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
            }
            
            return value;
        });
        
        csvContent += row.join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `books_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Settings Modal Functions
function showSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('visible');
    }
}

function hideSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.remove('visible');
    }
}

// Import CSV data
function importBooksFromCSV(file) {
    if (!file) {
        alert('No file selected for import.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const lines = csvData.split('\n');
            
            // Get headers from first line
            const headers = lines[0].split(',').map(header => 
                header.trim().replace(/^"(.+)"$/, '$1') // Remove quotes if present
            );
            
            // Process data rows
            const books = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; // Skip empty lines
                
                // Split the line by commas not inside quotes
                let row = lines[i];
                let values = [];
                let inQuotes = false;
                let currentValue = '';
                
                for (let j = 0; j < row.length; j++) {
                    const char = row[j];
                    if (char === '"') {
                        if (j > 0 && row[j-1] === '\\') {
                            // Escaped quote
                            currentValue = currentValue.slice(0, -1) + '"';
                        } else {
                            // Toggle quote state
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        // End of value
                        values.push(currentValue.trim().replace(/^"(.+)"$/, '$1'));
                        currentValue = '';
                    } else {
                        // Part of value
                        currentValue += char;
                    }
                }
                values.push(currentValue.trim().replace(/^"(.+)"$/, '$1')); // Add the last value
                
                // Create book object from row values
                const book = {};
                headers.forEach((header, index) => {
                    let value = values[index] || '';
                    
                    // Convert string to array if needed
                    if (value.startsWith('[') && value.endsWith(']')) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            console.error(`Error parsing array for ${header}:`, e);
                        }
                    }
                    
                    // Convert empty strings to null for specific fields
                    if (value === '' && ['personalRating', 'userPageCount', 'pageCount'].includes(header)) {
                        value = null;
                    }
                    
                    book[header] = value;
                });
                
                books.push(book);
            }
            
            // Confirm before replacing existing data
            if (books.length > 0) {
                if (confirm(`Import ${books.length} books? This will replace your current library.`)) {
                    saveBooksToStorage(books);
                    alert(`Successfully imported ${books.length} books. Refreshing page...`);
                    location.reload(); // Refresh to show imported data
                }
            } else {
                alert('No valid book data found in the imported file.');
            }
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            alert('Error importing CSV file. Please check the file format and try again.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
}

// Barcode Scanner Functionality
let cameraStream = null;
let canvasContext = null;
let scanActive = false;

function initBarcodeScanner() {
    const cameraVideo = document.getElementById('camera-preview');
    const cameraCanvas = document.getElementById('camera-canvas');
    const cameraStatus = document.getElementById('camera-status');
    const cameraContainer = document.querySelector('.camera-container');
    
    if (!cameraContainer) return;
    
    canvasContext = cameraCanvas.getContext('2d', { willReadFrequently: true });
    
    // Helper function to log debug info - simplified to console only
    function logDebug(message, type = 'info') {
        // Only log to console in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`[Scanner ${type}]: ${message}`);
        }
    }
    
    // Only use the container click to toggle camera
    cameraContainer.addEventListener('click', toggleCamera);
    
    // Stop camera when modal is closed or canceled
    const isbnInputContainer = document.getElementById('isbn-input-container');
    if (isbnInputContainer) {
        isbnInputContainer.addEventListener('click', function(e) {
            // Only close if clicking directly on the modal container background (not its children)
            if (e.target === isbnInputContainer) {
                stopCamera();
            }
        });
    }
    
    // Also stop camera when cancel button is clicked
    const cancelIsbnInputBtn = document.getElementById('cancel-isbn-input-btn');
    if (cancelIsbnInputBtn) {
        cancelIsbnInputBtn.addEventListener('click', function() {
            stopCamera();
        });
    }
    
    // Add event listener to ISBN input field to auto-trigger lookup when a complete ISBN is entered
    const isbnManualInput = document.getElementById('isbn-manual-input');
    if (isbnManualInput) {
        isbnManualInput.addEventListener('input', function() {
            // Remove spaces, hyphens, etc. to get just the digits
            const isbn = this.value.replace(/[^0-9X]/gi, '');
            
            // Check if we have a complete ISBN (10 or 13 digits)
            if (/^(97(8|9))?\d{9}[\dX]$/i.test(isbn)) {
                // We have a complete ISBN, trigger lookup
                const lookupBtn = document.getElementById('isbn-lookup-btn');
                if (lookupBtn) {
                    logDebug(`Auto-triggering lookup for ISBN: ${isbn}`, 'success');
                    lookupBtn.click();
                }
            }
        });
    }
    
    function toggleCamera() {
        if (cameraStream) {
            stopCamera();
        } else {
            startCamera();
        }
    }
    
    function startCamera() {
        if (scanActive) return; // Already active
        
        scanActive = true;
        
        // Show camera elements
        cameraContainer.classList.add('active');
        document.querySelector('.camera-placeholder').style.display = 'none';
        
        // Add scanning target guide
        const scanTarget = document.createElement('div');
        scanTarget.id = 'scan-target-guide';
        scanTarget.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            height: 25%;
            border: 3px dashed #ff3333;
            border-radius: 10px;
            box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.3);
            z-index: 10;
        `;
        
        // Add text guide
        const scanGuideText = document.createElement('div');
        scanGuideText.style.cssText = `
            position: absolute;
            top: calc(50% - 70px);
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 11;
        `;
        scanGuideText.textContent = "Position barcode in box";
        
        cameraContainer.appendChild(scanTarget);
        cameraContainer.appendChild(scanGuideText);
        
        // Show camera if hidden
        cameraVideo.removeAttribute('hidden');
        cameraVideo.style.display = 'block';
        
        cameraStatus.textContent = 'Camera starting...';
        
        // Reset scan count and times
        scanCount = 0;
        lastRawData = null;
        
        // Clear any pending manual entry timeout
        if (window.manualEntryTimeout) {
            clearTimeout(window.manualEntryTimeout);
            window.manualEntryTimeout = null;
        }
        
        // Initialize scanner if needed
        if (!window.reader) {
            try {
                window.reader = new ZXing.BrowserMultiFormatReader();
                logDebug("ZXing barcode reader initialized", 'success');
            } catch (e) {
                logDebug(`Failed to initialize ZXing: ${e.message}`, 'error');
            }
        }
        
        // Get camera access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            }).then(function(stream) {
                if ('srcObject' in cameraVideo) {
                    cameraVideo.srcObject = stream;
                } else {
                    // Fallback for older browsers
                    cameraVideo.src = window.URL.createObjectURL(stream);
                }
                cameraVideo.play();
                
                // Show helpful instructions in the status area
                cameraStatus.textContent = 'Position barcode in red box and hold steady';
                
                // After 3 seconds, show a more detailed hint
                setTimeout(() => {
                    if (scanActive) {
                        cameraStatus.textContent = 'Make sure barcode is well-lit and not blurry';
                    }
                }, 3000);
                
                // After 10 seconds, show a patience message
                setTimeout(() => {
                    if (scanActive) {
                        cameraStatus.textContent = 'Still searching for barcode - keep it centered';
                    }
                }, 10000);
                
                // Start scanning
                scanBarcode();
                
            }).catch(function(error) {
                logDebug(`Camera error: ${error.name}: ${error.message}`, 'error');
                cameraStatus.textContent = `Camera error: ${error.message}`;
                scanActive = false;
            });
        } else {
            logDebug('getUserMedia not supported', 'error');
            cameraStatus.textContent = 'Camera not supported in this browser';
            scanActive = false;
        }
    }
    
    function stopCamera() {
        scanActive = false;
        
        // Clear any pending timeout for manual entry
        if (window.manualEntryTimeout) {
            clearTimeout(window.manualEntryTimeout);
            window.manualEntryTimeout = null;
        }
        
        if (cameraVideo && cameraVideo.srcObject) {
            const stream = cameraVideo.srcObject;
            const tracks = stream.getTracks();
            
            tracks.forEach(track => track.stop());
            
            cameraVideo.srcObject = null;
            cameraVideo.setAttribute('hidden', '');
            cameraVideo.style.display = 'none';
            
            cameraContainer.classList.remove('active');
            document.querySelector('.camera-placeholder').style.display = 'flex';
            
            // Remove scanning target guide
            const scanTarget = document.getElementById('scan-target-guide');
            if (scanTarget) scanTarget.remove();
            
            // Remove guide text
            const scanGuideText = cameraContainer.querySelector('div[style*="top: calc(50% - 70px)"]');
            if (scanGuideText) scanGuideText.remove();
            
            cameraStatus.textContent = '';
            logDebug('Camera stopped', 'info');
        }
    }
    
    let scanCount = 0;
    let lastRawData = null;
    
    function scanBarcode() {
        if (!scanActive) return;
        
        scanCount++;
        
        // Only log every 30 frames to avoid flooding the debug panel
        const shouldLog = scanCount % 30 === 0;
        
        if (cameraVideo.readyState === cameraVideo.HAVE_ENOUGH_DATA) {
            if (shouldLog) {
                logDebug(`Scanning frame #${scanCount}`, 'info');
            }
            
            try {
                // Draw video frame to canvas (invisible but used for image processing)
                cameraCanvas.height = cameraVideo.videoHeight;
                cameraCanvas.width = cameraVideo.videoWidth;
                canvasContext.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
                
                // Focus on the target area for ZXing
                const centerWidth = Math.floor(cameraCanvas.width * 0.7);
                const centerHeight = Math.floor(cameraCanvas.height * 0.25);
                const startX = Math.floor((cameraCanvas.width - centerWidth) / 2);
                const startY = Math.floor((cameraCanvas.height - centerHeight) / 2);
                
                // Get the imageData for the entire canvas
                const fullImageData = canvasContext.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);
                
                // Use our custom detector on the full image data but focusing on target area
                // Check only every 45 frames (about 1.5 seconds at 30fps) - Previously 15 frames
                if (scanCount % 20 === 0) {
                    if (detectBarcodeInImage(fullImageData)) {
                        // We found a likely barcode pattern, but don't show manual entry popup
                        // Just update the status
                        cameraStatus.textContent = "Barcode pattern detected - analyzing...";
                    }
                }
                
                // ZXING BARCODE CHECK - Try standard barcode scanning on target area only
                if (!window.reader) {
                    if (shouldLog) {
                        logDebug("ZXing reader not initialized", 'error');
                    }
                    return;
                }
                
                try {
                    // Create a smaller canvas for the target area
                    const targetCanvas = document.createElement('canvas');
                    targetCanvas.width = centerWidth;
                    targetCanvas.height = centerHeight;
                    const targetCtx = targetCanvas.getContext('2d');
                    
                    // Draw only the target area to this canvas
                    targetCtx.drawImage(cameraVideo, 
                        startX, startY, centerWidth, centerHeight,
                        0, 0, centerWidth, centerHeight);
                    
                    // Get the image data from this smaller targeted canvas
                    const targetImageData = targetCtx.getImageData(0, 0, centerWidth, centerHeight);
                    
                    // Try to decode just the target area
                    const code = window.reader.decode(targetImageData);
                    
                    if (code && code.text) {
                        if (code.text !== lastRawData) {
                            lastRawData = code.text;
                            logDebug(`Barcode detected in target area: "${code.text}"`, 'success');
                            
                            // Clear any pending manual entry timeout
                            if (window.manualEntryTimeout) {
                                clearTimeout(window.manualEntryTimeout);
                                window.manualEntryTimeout = null;
                            }
                            
                            processCodeData(code.text);
                        }
                    }
                } catch (decodeError) {
                    // Fallback for Type errors - try to extract the ISBN from the visible text
                    if (decodeError && decodeError.name === 'TypeError') {
                        logDebug("Type error in ZXing decode, trying alternative approach", 'warning');
                        // Try to detect if there's a barcode in the image at all
                        if (detectBarcodeInImage(fullImageData)) {
                            // Don't show manual entry popup, just update status
                            cameraStatus.textContent = "Analyzing barcode pattern...";
                        }
                    } else if (shouldLog && decodeError && decodeError.message && 
                               !decodeError.message.includes("could not find finder")) {
                        logDebug(`Decode error: ${decodeError.message || decodeError.name}`, 'warning');
                    }
                }
                
                // Add debug visualization for ISBN pattern detection
                if (scanCount % 10 === 0) { // Check frequently but not every frame
                    detectAndDisplayIsbnPattern();
                }
                
            } catch (error) {
                if (error && error.message && !error.message.includes("could not find finder")) {
                    logDebug(`Scanner error: ${error.message}`, 'error');
                }
            }
        } else if (shouldLog) {
            logDebug("Camera feed not ready yet", 'info');
        }
        
        // Continue scanning if still active
        if (scanActive) {
            requestAnimationFrame(scanBarcode);
        }
    }
    
    // Function to detect ISBN patterns in the image and display them
    function detectAndDisplayIsbnPattern() {
        try {
            if (!scanActive || !cameraCanvas) return;
            
            // Create a temporary canvas for OCR debugging
            const tempCanvas = document.createElement('canvas');
            const targetWidth = Math.floor(cameraCanvas.width * 0.7);  // 70% of width
            const targetHeight = Math.floor(cameraCanvas.height * 0.25); // 25% of height
            const startX = Math.floor((cameraCanvas.width - targetWidth) / 2);
            const startY = Math.floor((cameraCanvas.height - targetHeight) / 2);
            
            tempCanvas.width = targetWidth;
            tempCanvas.height = targetHeight;
            
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(cameraVideo, 
                startX, startY, targetWidth, targetHeight,
                0, 0, targetWidth, targetHeight);
            
            // Get the image data for OCR
            const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
            
            // This is a mock OCR function as we don't have a real OCR library
            // In a real implementation, you would use Tesseract.js or similar
            mockDetectIsbnText(imageData);
            
        } catch (error) {
            logDebug(`Error in ISBN pattern detection: ${error.message}`, 'error');
        }
    }
    
    // Mock function to simulate OCR detection of ISBN patterns
    function mockDetectIsbnText(imageData) {
        // Create or update debug info display
        let debugInfoDisplay = document.getElementById('isbn-debug-info');
        if (!debugInfoDisplay) {
            debugInfoDisplay = document.createElement('div');
            debugInfoDisplay.id = 'isbn-debug-info';
            debugInfoDisplay.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-width: 80%;
                z-index: 1000;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            `;
            cameraContainer.appendChild(debugInfoDisplay);
        }
        
        // Update metrics display
        debugInfoDisplay.innerHTML = `
            <div><strong>Frame:</strong> ${scanCount}</div>
            <div><strong>Image:</strong> ${imageData.width}x${imageData.height}</div>
            <div><strong>Transitions:</strong> ${window.lastTransitions || 0}</div>
            <div><strong>Dark/Bright:</strong> ${window.lastDarkCount || 0}/${window.lastBrightCount || 0}</div>
        `;
        
        // If we have raw barcode data, show it
        if (lastRawData) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>Raw data:</strong> ${lastRawData}`;
            debugInfoDisplay.appendChild(div);
            
            // Check if it contains ISBN pattern
            const isbnMatch = lastRawData.match(/ISBN[:\s-]*(\d[\d-]*)/i);
            if (isbnMatch) {
                const div = document.createElement('div');
                div.innerHTML = `<strong>ISBN found:</strong> ${isbnMatch[1]}`;
                div.style.color = '#00ff00';
                debugInfoDisplay.appendChild(div);
            }
        }
        
        // If we have detected barcode metrics, show them
        if (window.lastBarcodeDetected) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>Barcode detected:</strong> YES`;
            div.style.color = '#00ff00';
            debugInfoDisplay.appendChild(div);
        }
    }
    
    // Helper to detect barcode patterns in the image
    function detectBarcodeInImage(imageData) {
        // Focus on the center area of the image (where the guide rectangle is)
        const centerWidth = Math.floor(imageData.width * 0.7);  // 70% of width
        const centerHeight = Math.floor(imageData.height * 0.25); // 25% of height
        
        const startX = Math.floor((imageData.width - centerWidth) / 2);
        const startY = Math.floor((imageData.height - centerHeight) / 2);
        
        // For visual debugging (uncomment if needed)
        // canvasContext.strokeStyle = 'red';
        // canvasContext.strokeRect(startX, startY, centerWidth, centerHeight);
        
        let transitions = 0;
        let lastPixelDark = false;
        let darkCount = 0;
        let brightCount = 0;
        
        // Sample pixels in the target area only
        for (let y = startY; y < startY + centerHeight; y += 3) {
            const rowOffset = y * imageData.width * 4;
            
            lastPixelDark = false; // Reset for each row
            let rowTransitions = 0;
            
            for (let x = startX; x < startX + centerWidth; x += 2) {
                const idx = rowOffset + x * 4;
                if (idx >= imageData.data.length) continue;
                
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                
                // Calculate pixel brightness
                const brightness = (r + g + b) / 3;
                
                // Check if this is a dark pixel (likely part of barcode)
                const isDark = brightness < 100;
                
                if (isDark) {
                    darkCount++;
                } else {
                    brightCount++;
                }
                
                // Count transitions from dark to bright or bright to dark
                if (x > startX && isDark !== lastPixelDark) {
                    rowTransitions++;
                }
                
                lastPixelDark = isDark;
            }
            
            // Add row transitions to total
            transitions += rowTransitions;
        }
        
        // Store metrics for debugging
        window.lastTransitions = transitions;
        window.lastDarkCount = darkCount;
        window.lastBrightCount = brightCount;
        
        // If we see a high number of transitions and a decent ratio of dark/bright pixels,
        // it's likely a barcode - more strict thresholds
        const hasHighTransitions = transitions > 50; // Increased from 40 to 50
        const hasReasonableDarkBrightRatio = darkCount > 40 && brightCount > 40; // Increased from 30 to 40
        
        // Check for regular pattern (typical in barcodes)
        let hasRegularPattern = false;
        if (transitions > 30) { // Increased from 20 to 30
            // Count number of transitions in small segments to see if they're evenly distributed
            const segmentCount = 5;
            const segmentWidth = Math.floor(centerWidth / segmentCount);
            let segmentTransitions = new Array(segmentCount).fill(0);
            
            // Sample the middle row of the target area
            const middleY = startY + Math.floor(centerHeight / 2);
            const rowOffset = middleY * imageData.width * 4;
            
            lastPixelDark = false;
            for (let i = 0; i < segmentCount; i++) {
                const segStartX = startX + (i * segmentWidth);
                const segEndX = segStartX + segmentWidth;
                
                for (let x = segStartX; x < segEndX; x += 2) {
                    const idx = rowOffset + x * 4;
                    if (idx < imageData.data.length) {
                        const r = imageData.data[idx];
                        const g = imageData.data[idx + 1];
                        const b = imageData.data[idx + 2];
                        const brightness = (r + g + b) / 3;
                        const isDark = brightness < 100;
                        
                        if (x > segStartX && isDark !== lastPixelDark) {
                            segmentTransitions[i]++;
                        }
                        
                        lastPixelDark = isDark;
                    }
                }
            }
            
            // Calculate variation between segment transitions
            let sum = segmentTransitions.reduce((a, b) => a + b, 0);
            let mean = sum / segmentCount;
            let variance = segmentTransitions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / segmentCount;
            
            // Lower threshold for variance since we're in a targeted area
            // Require a higher minimum average of transitions per segment
            hasRegularPattern = (variance < 25) && (mean > 5);
            
            if (scanCount % 30 === 0) {
                logDebug(`Target area segments: ${segmentTransitions.join(', ')} | Variance: ${variance.toFixed(2)}`, 'info');
            }
        }
        
        // Require meeting all three criteria to detect a barcode
        const isBarcodeDetected = hasHighTransitions && hasReasonableDarkBrightRatio && hasRegularPattern;
        window.lastBarcodeDetected = isBarcodeDetected;
        
        // Log detection metrics periodically
        if (scanCount % 30 === 0) {
            logDebug(`Target area metrics: transitions=${transitions}, dark=${darkCount}, bright=${brightCount}`, 'info');
            if (isBarcodeDetected) {
                logDebug('BARCODE PATTERN DETECTED in target area!', 'success');
            }
        }
        
        return isBarcodeDetected;
    }

    // Try to manually extract ISBN from the canvas image - NO LONGER AUTO-TRIGGERED
    function tryManualIsbnExtraction() {
        // Let's check if we can extract an ISBN from the current frame
        const canvas = document.getElementById('camera-canvas');
        if (!canvas) return;
        
        logDebug("Attempting to extract potential ISBN from image", 'info');
        
        // Create a quick entry option without a specific ISBN
        // In a production app, you would implement actual OCR here
        createQuickIsbnButton();
    }

    // Add a manual ISBN button to the camera interface
    function addManualIsbnButton() {
        // Remove existing button if any
        const existingBtn = document.getElementById('manual-isbn-btn');
        if (existingBtn) existingBtn.remove();
        
        // Create manual entry button
        const manualBtn = document.createElement('button');
        manualBtn.id = 'manual-isbn-btn';
        manualBtn.className = 'manual-isbn-btn';
        manualBtn.textContent = 'Enter ISBN Manually';
        manualBtn.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 255, 255, 0.9);
            color: #0077cc;
            border: none;
            border-radius: 20px;
            padding: 8px 16px;
            font-weight: bold;
            z-index: 100;
        `;
        
        manualBtn.addEventListener('click', function() {
            tryManualIsbnExtraction();
        });
        
        cameraContainer.appendChild(manualBtn);
    }

    // Override the startCamera function to add the manual button
    function startCamera() {
        if (scanActive) return; // Already active
        
        scanActive = true;
        
        // Show camera elements
        cameraContainer.classList.add('active');
        document.querySelector('.camera-placeholder').style.display = 'none';
        
        // Add scanning target guide
        const scanTarget = document.createElement('div');
        scanTarget.id = 'scan-target-guide';
        scanTarget.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            height: 25%;
            border: 3px dashed #ff3333;
            border-radius: 10px;
            box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.3);
            z-index: 10;
        `;
        
        // Add text guide
        const scanGuideText = document.createElement('div');
        scanGuideText.style.cssText = `
            position: absolute;
            top: calc(50% - 70px);
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 11;
        `;
        scanGuideText.textContent = "Position barcode in box";
        
        cameraContainer.appendChild(scanTarget);
        cameraContainer.appendChild(scanGuideText);
        
        // Add manual ISBN button
        addManualIsbnButton();
        
        // Show camera if hidden
        cameraVideo.removeAttribute('hidden');
        cameraVideo.style.display = 'block';
        
        cameraStatus.textContent = 'Camera starting...';
        
        // Reset scan count and times
        scanCount = 0;
        lastRawData = null;
        
        // Clear any pending manual entry timeout
        if (window.manualEntryTimeout) {
            clearTimeout(window.manualEntryTimeout);
            window.manualEntryTimeout = null;
        }
        
        // Reset debug metrics
        window.lastTransitions = 0;
        window.lastDarkCount = 0; 
        window.lastBrightCount = 0;
        window.lastBarcodeDetected = false;
        
        // Initialize scanner if needed
        if (!window.reader) {
            try {
                window.reader = new ZXing.BrowserMultiFormatReader();
                logDebug("ZXing barcode reader initialized", 'success');
            } catch (e) {
                logDebug(`Failed to initialize ZXing: ${e.message}`, 'error');
            }
        }
        
        // Get camera access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            }).then(function(stream) {
                if ('srcObject' in cameraVideo) {
                    cameraVideo.srcObject = stream;
                } else {
                    // Fallback for older browsers
                    cameraVideo.src = window.URL.createObjectURL(stream);
                }
                cameraVideo.play();
                
                // Show helpful instructions in the status area
                cameraStatus.textContent = 'Position barcode in red box and hold steady';
                
                // After 3 seconds, show a more detailed hint
                setTimeout(() => {
                    if (scanActive) {
                        cameraStatus.textContent = 'Make sure barcode is well-lit and not blurry';
                    }
                }, 3000);
                
                // After 10 seconds, show a patience message
                setTimeout(() => {
                    if (scanActive) {
                        cameraStatus.textContent = 'Still scanning... Use manual button if needed';
                    }
                }, 10000);
                
                // Start scanning
                scanBarcode();
                
            }).catch(function(error) {
                logDebug(`Camera error: ${error.name}: ${error.message}`, 'error');
                cameraStatus.textContent = `Camera error: ${error.message}`;
                scanActive = false;
            });
        } else {
            logDebug('getUserMedia not supported', 'error');
            cameraStatus.textContent = 'Camera not supported in this browser';
            scanActive = false;
        }
    }
    
    function stopCamera() {
        scanActive = false;
        
        // Clear any pending timeout for manual entry
        if (window.manualEntryTimeout) {
            clearTimeout(window.manualEntryTimeout);
            window.manualEntryTimeout = null;
        }
        
        // Remove debug info display
        const debugInfo = document.getElementById('isbn-debug-info');
        if (debugInfo) debugInfo.remove();
        
        // Remove manual ISBN button
        const manualBtn = document.getElementById('manual-isbn-btn');
        if (manualBtn) manualBtn.remove();
        
        if (cameraVideo && cameraVideo.srcObject) {
            const stream = cameraVideo.srcObject;
            const tracks = stream.getTracks();
            
            tracks.forEach(track => track.stop());
            
            cameraVideo.srcObject = null;
            cameraVideo.setAttribute('hidden', '');
            cameraVideo.style.display = 'none';
            
            cameraContainer.classList.remove('active');
            document.querySelector('.camera-placeholder').style.display = 'flex';
            
            // Remove scanning target guide
            const scanTarget = document.getElementById('scan-target-guide');
            if (scanTarget) scanTarget.remove();
            
            // Remove guide text
            const scanGuideText = cameraContainer.querySelector('div[style*="top: calc(50% - 70px)"]');
            if (scanGuideText) scanGuideText.remove();
            
            cameraStatus.textContent = '';
            logDebug('Camera stopped', 'info');
        }
    }
}

// End of script