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

// Navigation state tracking
let previousViewBeforeAdd = null; // Tracks whether library or wishlist was active before add
let isAddingBook = false; // Flag to track if we're in the add book process
let addBookCancelled = false; // Flag to track if add book was cancelled

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
    sortSelect, removeCustomCoverBtn, settingsModal, // Add settingsModal variable
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
    if (!bookDisplayArea) {
        console.error("Unable to find book display area");
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
    if (isbnInputContainer) { 
        hideModal(isbnInputContainer);
    } 
}

function showAddBookModal(skipReset = false, title = "Add New Book") {
    if (!addBookFormContainer || !addBookFormTitle || !addBookForm || !saveBookBtn) {
        console.error("One or more add book modal elements not found!");
        return;
    }
    
    isAddingBook = true;
    addBookCancelled = false;
    
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
        // Clear the visible synopsis display text
        const synopsisDisplayText = addBookForm.querySelector('#synopsis-display-text');
        if (synopsisDisplayText) synopsisDisplayText.textContent = '';
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
    showModal(addBookFormContainer);
}

function hideAddBookModal() { 
    if (addBookFormContainer) { 
        hideModal(addBookFormContainer);
        
        // Return to previous state
        if (addBookCancelled) {
            // If cancelling an add-to-bookshelf, revert the book's status
            if (currentlyEditingBookId) {
                const book = allBooks.find(b => b.id === currentlyEditingBookId);
                if (book && book._originalStatus) {
                    book.status = book._originalStatus;
                    delete book._originalStatus;
                }
            }
            // If cancelled, go back to previous view
            if (previousViewBeforeAdd === 'wishlist') {
                isWishlistViewActive = true;
            } else {
                isWishlistViewActive = false;
            }
        } else {
            // If not cancelled, clean up any temp status
            if (currentlyEditingBookId) {
                const book = allBooks.find(b => b.id === currentlyEditingBookId);
                if (book && book._originalStatus) {
                    delete book._originalStatus;
                }
            }
        }
        
        // Reset flags
        isAddingBook = false;
        currentlyEditingBookId = null;
        
        // Update button highlights directly
        const homeBtn = document.getElementById('home-nav-btn');
        const wishlistBtn = document.getElementById('wishlist-nav-btn');
        const searchBtn = document.getElementById('search-nav-btn');
        const filterBtn = document.getElementById('filter-nav-btn');
        
        // Clear all highlights first
        if (homeBtn) homeBtn.classList.remove('active');
        if (wishlistBtn) wishlistBtn.classList.remove('active');
        if (searchBtn) searchBtn.classList.remove('active');
        
        // Set the correct view button
        if (isSearchActive && searchBtn) {
            searchBtn.classList.add('active');
        } else if (isWishlistViewActive && wishlistBtn) {
            wishlistBtn.classList.add('active');
        } else if (homeBtn) {
            homeBtn.classList.add('active');
        }
        
        // Also highlight filter button if filters are active
        if (isFilterActive && filterBtn) {
            filterBtn.classList.add('active');
        }
        
        renderBooks();
    } 
}

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

    showModal(bookDetailModal);
}

function hideBookDetailModal() { 
    if (bookDetailModal) { 
        hideModal(bookDetailModal);
        detailModalBookId = null; 
    } 
}

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

    console.log(`Opening rating modal for ${book.title}. Initial rating: ${initialRatingValue}`);

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
        editReviewBtn.textContent = currentReviewValue ? 'Edit Review' : 'Add Review';
    }

    // Setup interactive stars event listeners
    if (interactiveStarsContainer) {
        // Remove any existing event listeners to prevent duplicates
        interactiveStarsContainer.removeEventListener('mousedown', handleStarInteractionStart);
        interactiveStarsContainer.removeEventListener('touchstart', handleStarInteractionStart);
        interactiveStarsContainer.removeEventListener('mousemove', handleStarInteractionMove);
        interactiveStarsContainer.removeEventListener('touchmove', handleStarInteractionMove);
        document.removeEventListener('mouseup', handleStarInteractionEnd);
        document.removeEventListener('touchend', handleStarInteractionEnd);
        
        // Add event listeners for mouse and touch interactions
        interactiveStarsContainer.addEventListener('mousedown', handleStarInteractionStart);
        interactiveStarsContainer.addEventListener('touchstart', handleStarInteractionStart);
        interactiveStarsContainer.addEventListener('mousemove', handleStarInteractionMove);
        interactiveStarsContainer.addEventListener('touchmove', handleStarInteractionMove);
        document.addEventListener('mouseup', handleStarInteractionEnd);
        document.addEventListener('touchend', handleStarInteractionEnd);
        
        console.log("Rating stars event listeners attached");
    } else {
        console.error("Interactive stars container not found!");
    }

    updateRatingModalButtons();
    showModal(ratingModal);
}

function closeRatingModal() {
    if (ratingModal) {
        hideModal(ratingModal);
        currentRatingBookId = null;
    }
    if (reviewDisplayArea) reviewDisplayArea.style.display = 'block';
    if (editReviewBtn) editReviewBtn.style.display = 'inline-block';
    if (reviewInput) {
        reviewInput.style.display = 'none';
        reviewInput.readOnly = true;
    }
    
    // Clean up event listeners
    if (interactiveStarsContainer) {
        interactiveStarsContainer.removeEventListener('mousedown', handleStarInteractionStart);
        interactiveStarsContainer.removeEventListener('touchstart', handleStarInteractionStart);
        interactiveStarsContainer.removeEventListener('mousemove', handleStarInteractionMove);
        interactiveStarsContainer.removeEventListener('touchmove', handleStarInteractionMove);
        document.removeEventListener('mouseup', handleStarInteractionEnd);
        document.removeEventListener('touchend', handleStarInteractionEnd);
        console.log("Rating stars event listeners removed");
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
    console.log("Star interaction started");
    isRatingInteractionActive = true;
    const newRating = calculateRatingFromEvent(event);
    console.log(`Initial rating calculation: ${newRating}`);
    if (typeof newRating === 'number') { 
        updateInteractiveStarsVisual(newRating);
    }
}

function handleStarInteractionMove(event) {
    if (!isRatingInteractionActive) return;
    const newRating = calculateRatingFromEvent(event);
    console.log(`Move rating calculation: ${newRating}`);
    if (typeof newRating === 'number') { 
        updateInteractiveStarsVisual(newRating);
    }
}

function handleStarInteractionEnd(event) {
    if (!isRatingInteractionActive) return;
    console.log("Star interaction ended");
    isRatingInteractionActive = false;
    const finalRating = calculateRatingFromEvent(event);
    console.log(`Final rating: ${finalRating}`);
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
        showModal(searchModal);
        if (searchInput) {
            searchInput.value = currentSearchTerm || '';
            searchInput.focus();
        }
        if (searchStatusElement) {
            searchStatusElement.textContent = '';
        }
    }
}

function hideSearchModal() { 
    if (searchModal) { 
        hideModal(searchModal);
    } 
}

function performSearch() {
    if (!searchInput) return;
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        if (searchStatusElement) searchStatusElement.textContent = 'Please enter a search term.';
        searchInput.focus();
        return;
    }
    console.log(`Performing search for: \"${searchTerm}\"`);
    currentSearchTerm = searchTerm;
    isSearchActive = true;
    
    // Update search button appearance directly without calling updateSearchButtonAppearance
    const searchBtn = document.getElementById('search-nav-btn');
    if (searchBtn) {
        // Update button content
        searchBtn.innerHTML = '<span class="material-symbols-outlined">close</span><span>Clear Search</span>';
        
        // Highlight the search button
        searchBtn.classList.add('active');
        
        // Remove active class from home and wishlist buttons
        const homeBtn = document.getElementById('home-nav-btn');
        const wishlistBtn = document.getElementById('wishlist-nav-btn');
        if (homeBtn) homeBtn.classList.remove('active');
        if (wishlistBtn) wishlistBtn.classList.remove('active');
        
        // Fix the styles directly
        const icon = searchBtn.querySelector('.material-symbols-outlined');
        const text = searchBtn.querySelector('span:not(.material-symbols-outlined)');
        
        if (icon) {
            icon.style.cssText = `
                display: block !important; 
                visibility: visible !important; 
                opacity: 1 !important; 
                font-size: 1.5rem !important; 
                margin-bottom: 0.3rem !important;
                position: relative !important;
                z-index: 5 !important;
            `;
        }
        
        if (text) {
            text.style.cssText = `
                display: block !important; 
                visibility: visible !important; 
                opacity: 1 !important; 
                font-size: 0.7rem !important;
                position: relative !important;
                z-index: 5 !important;
            `;
        }
    }
    
    renderBooks();
    hideSearchModal();
}

function clearSearch() {
    console.log("Clearing search");
    currentSearchTerm = '';
    isSearchActive = false;
    if (searchInput) searchInput.value = '';
    
    // Update search button appearance directly without calling updateSearchButtonAppearance
    const searchBtn = document.getElementById('search-nav-btn');
    if (searchBtn) {
        searchBtn.innerHTML = '<span class="material-symbols-outlined">search</span><span>Search</span>';
        
        // Fix the styles directly
        const icon = searchBtn.querySelector('.material-symbols-outlined');
        const text = searchBtn.querySelector('span:not(.material-symbols-outlined)');
        
        if (icon) {
            icon.style.cssText = `
                display: block !important; 
                visibility: visible !important; 
                opacity: 1 !important; 
                font-size: 1.5rem !important; 
                margin-bottom: 0.3rem !important;
                position: relative !important;
                z-index: 5 !important;
            `;
        }
        
        if (text) {
            text.style.cssText = `
                display: block !important; 
                visibility: visible !important; 
                opacity: 1 !important; 
                font-size: 0.7rem !important;
                position: relative !important;
                z-index: 5 !important;
            `;
        }
    }
    
    // Don't call setActiveNavButtons here - this should be called by the function that called clearSearch
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
        if (detectedSeries.seriesTitle) {
            setVal('#userSeriesTitle', detectedSeries.seriesTitle);
            if (detectedSeries.seriesNumber) {
                setVal('#userSeriesNumber', detectedSeries.seriesNumber);
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
    const formCoverPreview = document.getElementById('form-cover-preview');
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                fileNameDisplay.textContent = file.name;

                // Read the file and update preview and data URL
                const reader = new FileReader();
                reader.onload = function(e) {
                    selectedCoverImageDataUrl = e.target.result;
                    if (formCoverPreview) {
                        formCoverPreview.src = selectedCoverImageDataUrl;
                        formCoverPreview.style.display = 'block';
                        formCoverPreview.classList.remove('placeholder');
                        formCoverPreview.classList.add('custom-cover');
                    }
                };
                reader.readAsDataURL(file);
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                selectedCoverImageDataUrl = null;
                if (formCoverPreview) {
                    formCoverPreview.src = '#';
                    formCoverPreview.style.display = 'none';
                    formCoverPreview.classList.remove('custom-cover');
                }
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

    // Update known series titles if a new one was added
    if (saveData.userSeriesTitle && saveData.userSeriesTitle.trim()) {
        const currentSeriesTitles = loadSeriesTitles();
        if (!currentSeriesTitles.includes(saveData.userSeriesTitle.trim())) {
            saveSeriesTitles([...currentSeriesTitles, saveData.userSeriesTitle.trim()]);
        }
    }
    
    // Set view based on the book's status
    if (status === 'Wishlist') {
        isWishlistViewActive = true;
    } else {
        isWishlistViewActive = false;
    }
    
    // Clear search and filters when a book is added
    if (isSearchActive) {
        clearSearch();
    }
    if (isFilterActive) {
        clearFilters();
    }
    
    // Reset flags
    addBookCancelled = false;
    isAddingBook = false;
    currentlyEditingBookId = null;
    currentlyFetchedApiData = null; 
    selectedCoverImageDataUrl = null;
    customCoverRemoved = false;
    
    // Hide the form modal
    hideAddBookModal();
    
    // Re-render the book display - setActiveNavButtons is called by hideAddBookModal
    renderBooks();
}

// --- Data Reset ---
function resetAllData() {
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

    showModal(filterModal);
}

function hideFilterModal() { 
    if (filterModal) { 
        hideModal(filterModal);
    } 
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

    // Update the filter button highlight directly
    const filterBtn = document.getElementById('filter-nav-btn');
    if (filterBtn && isFilterActive) {
        filterBtn.classList.add('active');
    }
    
    renderBooks(); // Re-render with new filters
    hideFilterModal();
}

function handleClearFilters() {
    // Reset all filter checkboxes
    if (filterForm) {
        // Reset checkboxes
        const checkboxes = filterForm.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        // Reset radio buttons to "Any" option
        const anyRatingOption = filterForm.querySelector('#filter-rating-any');
        if (anyRatingOption) anyRatingOption.checked = true;
    }
    
    clearFilters();
    
    // Hide filter modal
    hideFilterModal();
}

// --- Sort Handler ---
function handleSortChange(event) {
    const selectedOption = event.target.value;
    const [field, direction] = selectedOption.split('_');
    console.log(`Sorting by ${field} in ${direction} order`);
        currentSort = { field, direction };
    renderBooks();
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

// Settings modal functions
function showSettingsModal() {
    if (settingsModal) {
        showModal(settingsModal);
    }
}

function hideSettingsModal() {
    if (settingsModal) {
        hideModal(settingsModal);
    }
}

// Export/Import functions
function exportBooksToCSV() {
    if (allBooks.length === 0) {
        alert('No books to export.');
        return;
    }
    
    // CSV Header
    const csvHeader = [
        'ISBN', 'Title', 'Authors', 'Status', 'Reader', 'Rating', 
        'Date Added', 'Date Finished', 'Series', 'Series Number', 
        'Page Count', 'Publisher', 'Publication Year', 'Tags', 'Review'
    ].join(',');
    
    // Convert each book to CSV row
    const csvRows = allBooks.map(book => {
        // Escape fields that may contain commas
        const escapeField = (field) => {
            if (field === null || field === undefined) return '';
            const str = String(field);
            return str.includes(',') ? `"${str}"` : str;
        };
        
        const authors = escapeField(book.authors.join('; '));
        const tags = escapeField(book.customTags.join('; '));
        const review = escapeField(book.review);
        const title = escapeField(book.title);
        
        return [
            book.isbn,
            title,
            authors,
            book.status,
            book.reader,
            book.personalRating || '',
            formatDisplayDate(book.dateAdded),
            book.dateFinished ? formatDisplayDate(book.dateFinished) : '',
            escapeField(book.seriesTitle),
            book.seriesNumber || '',
            book.effectivePageCount || '',
            escapeField(book.publisher),
            book.publicationYear,
            tags,
            review
        ].join(',');
    });
    
    // Create CSV content
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookshelf_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete book function
function handleDeleteBook(bookId) {
    const bookToDelete = allBooks.find(book => book.id === bookId);
    if (!bookToDelete) return;
    
    const confirmMessage = `Are you sure you want to delete "${bookToDelete.title}"? This cannot be undone.`;
    if (confirm(confirmMessage)) {
        // Remove the book from the array
        allBooks = allBooks.filter(book => book.id !== bookId);
        
        // Update storage
        saveBooksToStorage(allBooks);
        
        // Close the detail modal
        hideBookDetailModal();
        
        // Re-render the books
        renderBooks();
        
        console.log(`Book deleted: ${bookToDelete.title}`);
    }
}

function importBooksFromCSV(file) {
    if (!file) {
        alert('No file selected.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const csvData = event.target.result;
            const lines = csvData.split('\n');
            const headers = lines[0].split(',');
            
            // Expected headers
            const requiredHeaders = ['ISBN', 'Title', 'Authors', 'Status'];
            
            // Validate if the CSV has the minimum required headers
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                alert(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                return;
            }
            
            // Parse CSV rows into books
            const importedBooks = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; // Skip empty lines
                
                const values = parseCSVLine(lines[i]);
                if (values.length !== headers.length) {
                    console.error(`Line ${i} has ${values.length} values, expected ${headers.length}`);
                    continue;
                }
                
                // Create a map of field values
                const bookData = {};
                headers.forEach((header, index) => {
                    bookData[header.trim()] = values[index];
                });
                
                // Convert authors from string to array
                const authors = bookData['Authors'] ? bookData['Authors'].split(';').map(a => a.trim()) : [];
                
                // Convert tags from string to array
                const tags = bookData['Tags'] ? bookData['Tags'].split(';').map(t => t.trim()) : [];
                
                // Create a new book object
                const newBook = new BookV2(
                    bookData['ISBN'] || '',
                    bookData['Title'] || '',
                    authors,
                    '', // No cover image from CSV
                    bookData['Synopsis'] || '',
                    bookData['Publisher'] || '',
                    bookData['Publication Year'] || '',
                    bookData['Page Count'] ? parseInt(bookData['Page Count'], 10) : null,
                    [], // No genres from CSV
                    bookData['Series'] || '',
                    bookData['Series Number'] || '',
                    bookData['Reader'] || '',
                    bookData['Status'] || '',
                    bookData['Rating'] ? parseFloat(bookData['Rating']) : null,
                    new Date().toISOString(), // Current date as import date
                    bookData['Date Finished'] || null,
                    tags,
                    '', // No user series title
                    '', // No user series number
                    null, // No user page count
                    null, // No user cover image
                    bookData['Review'] || ''
                );
                
                importedBooks.push(newBook);
            }
            
            if (importedBooks.length === 0) {
                alert('No valid books found in the CSV file.');
                return;
            }
            
            // Confirm import
            if (confirm(`Import ${importedBooks.length} books?`)) {
                // Add the imported books to the existing books
                allBooks = [...allBooks, ...importedBooks];
                saveBooksToStorage(allBooks);
                alert(`Successfully imported ${importedBooks.length} books.`);
                renderBooks();
            }
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            alert('Error importing CSV file. Please check the file format.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file.');
    };
    
    reader.readAsText(file);
}

// Helper function to parse CSV line correctly handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Add the last value
    result.push(currentValue);
    return result;
}

// --- Document Ready --- //
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing app...");
    
    // Initialize dark mode from saved preference
    updateDarkModeUI();
    
    // --- UI Elements (Assignment) ---
        bookDisplayArea = document.getElementById('book-display-area');
    
    // Initialize all UI element references
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
    
    // Bottom Navigation Bar Elements
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
    settingsModal = document.getElementById('settings-modal');
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
    
    // Export/Import Functionality
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
    
    // Search modal
        if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', performSearch);
        if (searchCancelBtn) {
            searchCancelBtn.addEventListener('click', function() {
                console.log("Search cancelled");
                hideSearchModal();
                // Don't change any state - just return to previous view
                // The active buttons should already be set correctly
            });
        }
    
    // Filter functionality
    if (filterApplyBtn) filterApplyBtn.addEventListener('click', handleApplyFilters);
    if (filterClearBtn) filterClearBtn.addEventListener('click', handleClearFilters);
    if (filterCancelBtn) filterCancelBtn.addEventListener('click', hideFilterModal);
    
    // ISBN input modal
    if (isbnLookupButton) isbnLookupButton.addEventListener('click', handleIsbnLookup);
    if (cancelIsbnInputButton) {
        cancelIsbnInputButton.addEventListener('click', function() {
            console.log("Cancel ISBN lookup clicked");
            addBookCancelled = true;
            hideIsbnInputModal();
            
            // Reset flags
            isAddingBook = false;
            
            // Update button highlights directly based on current view
            const homeBtn = document.getElementById('home-nav-btn');
            const wishlistBtn = document.getElementById('wishlist-nav-btn');
            const searchBtn = document.getElementById('search-nav-btn');
            const filterBtn = document.getElementById('filter-nav-btn');
            
            // Clear all highlights first
            if (homeBtn) homeBtn.classList.remove('active');
            if (wishlistBtn) wishlistBtn.classList.remove('active');
            if (searchBtn) searchBtn.classList.remove('active');
            
            // Set the correct view button
            if (isSearchActive && searchBtn) {
                searchBtn.classList.add('active');
            } else if (isWishlistViewActive && wishlistBtn) {
                wishlistBtn.classList.add('active');
            } else if (homeBtn) {
                homeBtn.classList.add('active');
            }
            
            // Also highlight filter button if filters are active
            if (isFilterActive && filterBtn) {
                filterBtn.classList.add('active');
            }
        });
    }
    if (addManuallyBtn) addManuallyBtn.addEventListener('click', function() {
        console.log("Add manually clicked");
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
    
    // Function to set active bottom nav button(s)
    function setActiveNavButtons() {
        // Remove active class from all buttons
        document.querySelectorAll('.bottom-nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Highlight the appropriate view button
        if (isSearchActive) {
            const searchBtn = document.getElementById('search-nav-btn');
            if (searchBtn) searchBtn.classList.add('active');
        } else if (isWishlistViewActive) {
            const wishlistBtn = document.getElementById('wishlist-nav-btn');
            if (wishlistBtn) wishlistBtn.classList.add('active');
        } else {
            const homeBtn = document.getElementById('home-nav-btn');
            if (homeBtn) homeBtn.classList.add('active');
        }
        
        // If filters are active, also highlight the filter button
        if (isFilterActive) {
            const filterBtn = document.getElementById('filter-nav-btn');
            if (filterBtn) filterBtn.classList.add('active');
        }
    }
    
    // Bottom Nav Event Listeners
    if (homeNavBtn) {
        homeNavBtn.onclick = function() {
            console.log("Home button clicked");
            // Clear search if active
            if (isSearchActive) {
                clearSearch();
            }
            isWishlistViewActive = false;
            setActiveNavButtons();
            renderBooks();
            return false; // Prevent default
        };
    }
    
    if (addNavBtn) {
        addNavBtn.onclick = function() {
            console.log("Add button clicked");
            
            // Store current view state to return to
            previousViewBeforeAdd = isWishlistViewActive ? 'wishlist' : 'library';
            isAddingBook = true;
            addBookCancelled = false;
            
            // Don't change the active buttons yet - this happens after add completes or cancels
            showIsbnInputModal();
            return false; // Prevent default
        };
    }
    
    if (searchNavBtn) {
        searchNavBtn.onclick = function() {
            console.log("Search button clicked");
            
            // If search is active, clear it
            if (isSearchActive) {
                clearSearch();
                setActiveNavButtons();
            } else {
                // Show search modal
                showSearchModal();
            }
            return false; // Prevent default
        };
    }
    
    if (wishlistNavBtn) {
        wishlistNavBtn.onclick = function() {
            console.log("Wishlist button clicked");
            // Clear search if active
            if (isSearchActive) {
                clearSearch();
            }
            isWishlistViewActive = true;
            setActiveNavButtons();
            renderBooks();
            return false; // Prevent default
        };
    }
    
    if (filterNavBtn) {
        filterNavBtn.onclick = function() {
            console.log("Filter button clicked");
            // Don't clear search - filters work with search results too
            showFilterModal();
            return false; // Prevent default
        };
    }

    // Function to fix navigation bar icon display issues
    function fixNavigationButtons() {
        const navButtons = document.querySelectorAll('.bottom-nav-button');
        navButtons.forEach(btn => {
            // For the search button, use direct manipulation
            if (btn.id === 'search-nav-btn') {
                // Keep the button's structure intact
                btn.style.cssText = `
                    height: auto !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                `;
                
                // Only update the contents if search is not active
                if (!isSearchActive) {
                    // Make sure we're not changing active search status layout
                    if (!btn.innerHTML.includes("Clear Search")) {
                        btn.innerHTML = '<span class="material-symbols-outlined">search</span><span>Search</span>';
                    }
                }
                
                // Style the contents properly
                const icon = btn.querySelector('.material-symbols-outlined');
                const text = btn.querySelector('span:not(.material-symbols-outlined)');
                
                if (icon) {
                    icon.style.cssText = `
                        display: block !important; 
                        visibility: visible !important; 
                        opacity: 1 !important; 
                        font-size: 1.5rem !important; 
                        margin-bottom: 0.3rem !important;
                        position: relative !important;
                        z-index: 5 !important;
                    `;
                }
                
                if (text) {
                    text.style.cssText = `
                        display: block !important; 
                        visibility: visible !important; 
                        opacity: 1 !important; 
                        font-size: 0.7rem !important;
                        position: relative !important;
                        z-index: 5 !important;
                    `;
                }
                
                return;
            }
            
            const icon = btn.querySelector('.material-symbols-outlined');
            const text = btn.querySelector('span:not(.material-symbols-outlined)');
            
            // Reset any inline styles on the button itself
            btn.style.cssText = `
                height: auto !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                pointer-events: auto !important;
                cursor: pointer !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            if (icon) {
                // Force icon visibility with !important (via JS)
                icon.style.cssText = `
                    display: block !important; 
                    visibility: visible !important; 
                    opacity: 1 !important; 
                    font-size: 1.5rem !important; 
                    margin-bottom: 0.3rem !important;
                    position: relative !important;
                    z-index: 5 !important;
                `;
                icon.classList.remove('hidden');
                
                // Ensure parent elements don't hide the icon
                let parent = icon.parentElement;
                while (parent && parent !== document.body) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        parent.style.display = 'block !important';
                    }
                    if (window.getComputedStyle(parent).visibility === 'hidden') {
                        parent.style.visibility = 'visible !important';
                    }
                    if (window.getComputedStyle(parent).opacity === '0') {
                        parent.style.opacity = '1 !important';
                    }
                    parent = parent.parentElement;
                }
            }
            
            if (text) {
                // Force text visibility with !important (via JS)
                text.style.cssText = `
                    display: block !important; 
                    visibility: visible !important; 
                    opacity: 1 !important; 
                    font-size: 0.7rem !important;
                    position: relative !important;
                    z-index: 5 !important;
                `;
                text.classList.remove('hidden');
            }
        });
    }
    
    // Run fix when nav buttons are clicked
    // Using the new onclick handlers instead of addEventListener
    if (homeNavBtn) {
        const oldHomeClick = homeNavBtn.onclick;
        homeNavBtn.onclick = function() {
            setTimeout(fixNavigationButtons, 50);
            return oldHomeClick ? oldHomeClick.apply(this, arguments) : true;
        };
    }
    
    if (addNavBtn) {
        const oldAddClick = addNavBtn.onclick;
        addNavBtn.onclick = function() {
            setTimeout(fixNavigationButtons, 50);
            return oldAddClick ? oldAddClick.apply(this, arguments) : true;
        };
    }
    
    if (wishlistNavBtn) {
        const oldWishlistClick = wishlistNavBtn.onclick;
        wishlistNavBtn.onclick = function() {
            setTimeout(fixNavigationButtons, 50);
            return oldWishlistClick ? oldWishlistClick.apply(this, arguments) : true;
        };
    }
    
    if (filterNavBtn) {
        const oldFilterClick = filterNavBtn.onclick;
        filterNavBtn.onclick = function() {
            setTimeout(fixNavigationButtons, 50);
            return oldFilterClick ? oldFilterClick.apply(this, arguments) : true;
        };
    }
    
    if (searchNavBtn) {
        const oldSearchClick = searchNavBtn.onclick;
        searchNavBtn.onclick = function() {
            setTimeout(fixNavigationButtons, 50);
            return oldSearchClick ? oldSearchClick.apply(this, arguments) : true;
        };
    }
    
    // Run fix periodically with reduced frequency
    setInterval(fixNavigationButtons, 2000);

    // --- Book Data Loading & Initial Render ---
    allBooks = loadBooksFromStorage();
    populateSeriesDatalist();
    renderBooks();
    
    // Ensure custom cover upload works
    updateFileNameDisplay();

    // Remove custom cover functionality
    if (removeCustomCoverBtn) {
        removeCustomCoverBtn.addEventListener('click', function() {
            selectedCoverImageDataUrl = null;
            customCoverRemoved = true;
            const fileInput = document.getElementById('userCoverImage');
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileInput) fileInput.value = '';
            if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
            if (formCoverPreview) {
                formCoverPreview.src = '#';
                formCoverPreview.style.display = 'none';
                formCoverPreview.classList.remove('custom-cover');
            }
        });
    }

    // --- Custom Reset Confirmation Modal Logic ---
    const resetConfirmModal = document.getElementById('reset-confirm-modal');
    const resetConfirmOkBtn = document.getElementById('reset-confirm-ok-btn');
    const resetConfirmCancelBtn = document.getElementById('reset-confirm-cancel-btn');

    if (resetDataButton) {
      // Remove any previous event listeners by setting onclick directly
      resetDataButton.onclick = function() {
        if (resetConfirmModal) showModal(resetConfirmModal);
      };
    }
    if (resetConfirmOkBtn) {
      resetConfirmOkBtn.onclick = function() {
        hideModal(resetConfirmModal);
        resetAllData();
      };
    }
    if (resetConfirmCancelBtn) {
      resetConfirmCancelBtn.onclick = function() {
        hideModal(resetConfirmModal);
      };
    }
    // --- END Custom Reset Confirmation Modal Logic ---
});