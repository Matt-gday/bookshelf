// Main application logic will go here

console.log("Bookshelf app script loaded. Waiting for DOMContentLoaded...");

document.addEventListener('DOMContentLoaded', () => {

    console.log("DOMContentLoaded event fired. Initializing application...");

    // --- Data Model ---

    /**
     * Represents a single book in the collection.
     */
    class Book {
        constructor(
            // Fields Primarily from API (or manual input if API fails)
            isbn = '',          // 10 or 13 digits, can be used as ID
            title = '',         // Essential
            authors = [],       // Array of strings, Essential
            coverImageUrl = '', // URL string
            synopsis = '',      // String
            publisher = '',     // String (Optional)
            publicationYear = '',// String or Number
            pageCount = null,   // Number (Important for stats)
            apiGenres = [],     // Array of strings from API
            apiSeriesTitle = '',// String from API
            apiSeriesNumber = '',// String or Number from API

            // Fields Added/Managed by the User
            reader = '',        // Required: "Matt to Victoria" or "Victoria Reads Self"
            status = '',        // Required: "Currently Reading", "Finished", "Wishlist"
            personalRating = null,// Number (0-5, 0.5 increments), null if unrated
            dateAdded = new Date().toISOString(), // Auto timestamp
            dateFinished = null,  // ISO Date string or null
            userGenres = [],    // Array of strings (curated list)
            customTags = [],    // Array of strings (free-form)
            notes = '',         // Multi-line text
            userSeriesTitle = '',// String (Overrides API)
            userSeriesNumber = '',// String or Number (Overrides API)
            userPageCount = null, // Number (Overrides API)
            userCoverImage = null // Could store path or data URL if needed for local overrides
        ) {
            // Assign API/Manual fields
            this.isbn = isbn;
            this.title = title;
            this.authors = Array.isArray(authors) ? authors : (authors ? [authors] : []); // Ensure array
            this.coverImageUrl = coverImageUrl;
            this.synopsis = synopsis;
            this.publisher = publisher;
            this.publicationYear = publicationYear;
            this.pageCount = pageCount; // API page count
            this.apiGenres = Array.isArray(apiGenres) ? apiGenres : (apiGenres ? [apiGenres] : []);
            this.apiSeriesTitle = apiSeriesTitle;
            this.apiSeriesNumber = apiSeriesNumber;

            // Assign User-managed fields
            this.reader = reader;
            this.status = status;
            this.personalRating = personalRating;
            this.dateAdded = dateAdded;
            this.dateFinished = dateFinished;
            this.userGenres = Array.isArray(userGenres) ? userGenres : (userGenres ? [userGenres] : []);
            this.customTags = Array.isArray(customTags) ? customTags : (customTags ? [customTags] : []);
            this.notes = notes;
            this.userSeriesTitle = userSeriesTitle;
            this.userSeriesNumber = userSeriesNumber;
            this.userPageCount = userPageCount; // User-defined page count
            this.userCoverImage = userCoverImage;

            // Generate a unique ID for internal use if ISBN is missing or not unique enough
            // For now, we'll rely on dateAdded + title as a fallback, but ISBN should be primary
            this.id = isbn || `${title}-${dateAdded}`;
        }

        // --- Computed Properties / Getters ---

        /** Gets the effective series title (User override or API) */
        get seriesTitle() {
            return this.userSeriesTitle || this.apiSeriesTitle;
        }

        /** Gets the effective series number (User override or API) */
        get seriesNumber() {
            return this.userSeriesNumber || this.apiSeriesNumber;
        }

         /** Gets the effective page count (User override or API) */
         get effectivePageCount() {
            return this.userPageCount !== null ? this.userPageCount : this.pageCount;
        }

        /** Gets the primary cover image URL (User override or API) */
        get displayCoverUrl() {
            // Later: Add logic for userCoverImage (e.g., if it's a data URL)
            return this.userCoverImage || this.coverImageUrl || 'placeholder-cover.png'; // Provide a default placeholder
        }

        /** Gets a combined list of genres */
        get allGenres() {
            // Simple combination, might need refinement for uniqueness
            return [...new Set([...this.userGenres, ...this.apiGenres])];
        }
    }

    // --- Local Storage Interaction ---

    const STORAGE_KEY = 'victoriaBookshelfData';

    /**
     * Loads the book array from Local Storage.
     * @returns {Book[]} An array of Book objects.
     */
    function loadBooksFromStorage() {
        const jsonData = localStorage.getItem(STORAGE_KEY);
        if (!jsonData) {
            return []; // Return empty array if nothing is stored
        }
        try {
            const rawData = JSON.parse(jsonData);
            // Important: Re-construct Book objects to ensure methods are available
            return rawData.map(bookData => Object.assign(new Book(), bookData));
        } catch (error) {
            console.error("Error parsing book data from Local Storage:", error);
            return []; // Return empty array on error
        }
    }

    /**
     * Saves the book array to Local Storage.
     * @param {Book[]} books - The array of Book objects to save.
     */
    function saveBooksToStorage(books) {
        if (!Array.isArray(books)) {
            console.error("Invalid data type passed to saveBooksToStorage. Expected array.");
            return;
        }
        try {
            const jsonData = JSON.stringify(books);
            localStorage.setItem(STORAGE_KEY, jsonData);
        } catch (error) {
            console.error("Error saving book data to Local Storage:", error);
            // Consider alerting the user if saving fails critically
        }
    }

    // --- Global State (simple approach for now) ---

    let allBooks = []; // Holds all books loaded from storage
    let currentView = 'grid'; // 'grid' or 'list'
    let currentlyFetchedApiData = null; // Holds data between API lookup and form save
    let barcodeDetector = null; // Instance of BarcodeDetector (kept for image processing)
    let currentObjectUrl = null; // To revoke preview URL later

    // --- UI Elements ---

    const bookDisplayArea = document.getElementById('book-display-area');
    const viewToggleButton = document.getElementById('view-toggle-btn');
    const addBookButton = document.getElementById('add-book-btn'); // Button in top bar

    // ISBN Input Modal Elements
    const isbnInputContainer = document.getElementById('isbn-input-container');
    const isbnManualInput = document.getElementById('isbn-manual-input');
    const isbnLookupButton = document.getElementById('isbn-lookup-btn');
    const cancelIsbnInputButton = document.getElementById('cancel-isbn-input-btn');
    const imagePreviewElement = document.getElementById('image-preview');
    const barcodePhotoInput = document.getElementById('barcode-photo-input');
    const scanStatusElement = document.getElementById('scan-status');

    // Add Book Form Modal Elements
    const addBookFormContainer = document.getElementById('add-book-form-container');
    const addBookForm = document.getElementById('add-book-form');
    const cancelAddBookButton = document.getElementById('cancel-add-book-btn');
    const addBookFormTitle = document.getElementById('add-book-form-title');
    const resetDataButton = document.getElementById('reset-data-btn'); // Added Reset Button element

    // --- UI Rendering ---

    /**
     * Renders the list of books to the DOM based on the current view.
     */
    function renderBooks() {
        if (!bookDisplayArea) {
            console.error("Book display area not found!");
            return;
        }

        // Clear current display
        bookDisplayArea.innerHTML = '';
        // Remove existing view class, add current view class
        bookDisplayArea.classList.remove('grid-view', 'list-view');
        bookDisplayArea.classList.add(currentView === 'grid' ? 'grid-view' : 'list-view');

        if (allBooks.length === 0) {
            bookDisplayArea.innerHTML = '<p class="empty-state">Your bookshelf is empty. Add your first book!</p>';
            return;
        }

        allBooks.forEach(book => {
            const bookElement = document.createElement('div');
            bookElement.classList.add('book-item');
            bookElement.dataset.id = book.id; // Store book ID for later interaction

            // TODO: Add visual highlight for "Currently Reading" books

            if (currentView === 'grid') {
                bookElement.innerHTML = `
                    <img src="${book.displayCoverUrl}" alt="Cover for ${book.title}" class="book-cover" loading="lazy" onerror="this.src='placeholder-cover.png'; this.onerror=null;">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.authors.join(', ')}</p>
                `;
            } else { // List View
                bookElement.innerHTML = `
                    <img src="${book.displayCoverUrl}" alt="Cover for ${book.title}" class="book-cover-list" loading="lazy" onerror="this.src='placeholder-cover.png'; this.onerror=null;">
                    <div class="book-details-list">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">By: ${book.authors.join(', ')}</p>
                        <p class="book-status">Status: ${book.status}</p>
                        <p class="book-reader">Reader: ${book.reader}</p>
                        <!-- Add more details like rating later -->
                    </div>
                `;
            }

            // Add event listener for viewing details (Phase 4)
            // bookElement.addEventListener('click', () => viewBookDetails(book.id));

            bookDisplayArea.appendChild(bookElement);
        });
    }

    /**
     * Toggles the view between grid and list.
     */
    function toggleView() {
        currentView = (currentView === 'grid') ? 'list' : 'grid';
        // Update button text/icon (optional)
        if(viewToggleButton) viewToggleButton.textContent = `View: ${currentView === 'grid' ? 'List' : 'Grid'}`;
        console.log(`Switched view to: ${currentView}`);
        renderBooks();
    }

    // --- Modal Handling ---

    /** Shows the ISBN Input form modal */
    function showIsbnInputModal() {
        if (isbnInputContainer) {
            currentlyFetchedApiData = null; // Clear any previous API data
            if (isbnManualInput) isbnManualInput.value = '';

            // Reset photo input state
            if (barcodePhotoInput) barcodePhotoInput.value = null; // Clear selected file
            if (imagePreviewElement) {
                imagePreviewElement.style.display = 'none'; // Hide preview
                imagePreviewElement.removeAttribute('src'); // Remove old image source
                if (currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl); // Clean up previous blob URL
                    currentObjectUrl = null;
                }
            }
            if (scanStatusElement) scanStatusElement.textContent = 'Take/select photo or enter ISBN manually.';

            isbnInputContainer.classList.add('visible');
            // Focus manual input as primary fallback
            if (isbnManualInput) isbnManualInput.focus();
            // Attempt to initialize BarcodeDetector if supported (for later use)
            initializeBarcodeDetector();
        }
    }

    /** Hides the ISBN Input form modal */
    function hideIsbnInputModal() {
        if (isbnInputContainer) {
            isbnInputContainer.classList.remove('visible');
            // Clean up preview object URL if modal is closed
            if (currentObjectUrl) {
                 URL.revokeObjectURL(currentObjectUrl);
                 currentObjectUrl = null;
            }
        }
    }

    /**
     * Shows the Add Book form modal.
     * Can optionally skip reset if pre-filling data.
     * @param {boolean} skipReset - If true, doesn't reset the form.
     * @param {string} [title] - Optional title for the modal.
     */
    function showAddBookModal(skipReset = false, title = "Add New Book Manually") {
        if (addBookFormContainer) {
            if (!skipReset) {
                currentlyFetchedApiData = null; // Clear API data if showing manual form
                if (addBookForm) addBookForm.reset();
            }
            if(addBookFormTitle) {
                addBookFormTitle.textContent = title;
            }
            addBookFormContainer.classList.add('visible');
        }
    }

    /** Hides the Add Book form modal */
    function hideAddBookModal() {
        if (addBookFormContainer) {
            addBookFormContainer.classList.remove('visible');
        }
    }

    /**
     * Pre-fills the main Add Book form with data fetched from API and shows it.
     * @param {object} apiData - The book data fetched from the API.
     */
    function prefillAndShowAddBookForm(apiData) {
        if (!addBookForm || !apiData) return;

        console.log("Prefilling form with API data:", apiData);
        currentlyFetchedApiData = apiData; // Store API data for later use on save

        // Reset the form first
        addBookForm.reset();

        // Fill fields based on apiData
        const titleInput = addBookForm.querySelector('#title');
        const authorsInput = addBookForm.querySelector('#authors');
        const isbnInput = addBookForm.querySelector('#isbn');
        const pageCountInput = addBookForm.querySelector('#userPageCount');

        if (titleInput) titleInput.value = apiData.title || '';
        if (authorsInput) authorsInput.value = (apiData.authors || []).join(', ');
        if (isbnInput) isbnInput.value = apiData.isbn || '';
        if (pageCountInput && apiData.pageCount) pageCountInput.value = apiData.pageCount;

        // Show the modal with a confirmation title, skipping the reset
        showAddBookModal(true, "Confirm / Add Book Details");
    }

    // --- Scanner Handling (BarcodeDetector API on Image) ---

    /** Initializes BarcodeDetector if supported */
    async function initializeBarcodeDetector() {
        if (!('BarcodeDetector' in window)) {
            console.warn("Barcode Detector API is not supported in this browser.");
            // Update UI or disable photo button if needed
            return;
        }
        if (barcodeDetector) return; // Already initialized

        try {
            const supportedFormats = await BarcodeDetector.getSupportedFormats();
            if (supportedFormats.includes('ean_13')) {
                barcodeDetector = new BarcodeDetector({ formats: ['ean_13'] });
                console.log("BarcodeDetector initialized for EAN-13 (image detection).");
            } else {
                console.warn("EAN-13 format not supported by BarcodeDetector.");
                // Disable photo detection feature?
            }
        } catch (error) {
            console.error("Failed to create BarcodeDetector:", error);
        }
    }

    /** Handles the file selection/capture from the photo input */
    async function handlePhotoSelected(event) {
        const file = event.target.files ? event.target.files[0] : null;
        if (!file || !imagePreviewElement || !scanStatusElement) return;

        // Clear previous state
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
        }
        scanStatusElement.textContent = 'Processing image...';

        // Create a URL for preview
        currentObjectUrl = URL.createObjectURL(file);
        imagePreviewElement.src = currentObjectUrl;
        imagePreviewElement.style.display = 'block'; // Show preview

        // Attempt to detect barcode in the image
        if (!barcodeDetector) {
            console.warn("BarcodeDetector not initialized or not supported.");
            scanStatusElement.textContent = 'Cannot scan image (detector not ready/supported).';
            return;
        }

        try {
            // Use the img element as the source for detection
            const barcodes = await barcodeDetector.detect(imagePreviewElement);

            let foundIsbn = null;
            if (barcodes && barcodes.length > 0) {
                for (const barcode of barcodes) {
                    if (barcode.format === 'ean_13' && (barcode.rawValue.startsWith('978') || barcode.rawValue.startsWith('979'))) {
                        foundIsbn = barcode.rawValue;
                        break; // Found one, stop looking
                    }
                }
            }

            if (foundIsbn) {
                console.log(`Detected ISBN from image: ${foundIsbn}`);
                scanStatusElement.textContent = `ISBN Found: ${foundIsbn}`; // Update status
                // Automatically trigger the lookup
                handleIsbnLookup(foundIsbn); // Pass detected ISBN to lookup function
            } else {
                console.log("No ISBN barcode detected in the image.");
                scanStatusElement.textContent = 'No ISBN found in image. Try again or enter manually.';
            }

        } catch (error) {
            console.error("Error detecting barcode from image:", error);
            scanStatusElement.textContent = 'Error analyzing image.';
        }
    }

    // --- API Interaction (Google Books API) ---

    const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

    /**
     * Fetches book data from the Google Books API using an ISBN.
     * @param {string} isbn - The ISBN (10 or 13 digits) to search for.
     * @returns {Promise<object|null>} A promise that resolves to an object with book data or null if not found/error.
     */
    async function fetchBookDataByISBN(isbn) {
        // Clean the ISBN (remove hyphens, spaces)
        const cleanedIsbn = isbn.replace(/[-\s]/g, '');
        const url = `${GOOGLE_BOOKS_API_URL}?q=isbn:${cleanedIsbn}&maxResults=1`;

        console.log(`Fetching data for ISBN: ${cleanedIsbn} from ${url}`);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`API request failed with status: ${response.status}`);
                // Handle specific errors like 404 (Not Found) if needed
                return null;
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                console.log(`No book found for ISBN: ${cleanedIsbn}`);
                return null;
            }

            const bookData = data.items[0].volumeInfo;
            console.log("API Response volumeInfo:", bookData);

            // --- Corrected Cover Image URL Extraction ---
            let coverImageUrl = '';
            if (bookData.imageLinks) {
                const rawUrl = bookData.imageLinks.thumbnail || bookData.imageLinks.smallThumbnail || '';
                if (rawUrl) {
                    // Ensure it starts with https://
                    if (rawUrl.startsWith('http://')) {
                        coverImageUrl = rawUrl.replace(/^http:/, 'https:');
                    } else if (rawUrl.startsWith('https://')) {
                        coverImageUrl = rawUrl;
                    } else if (rawUrl.startsWith('//')) {
                        coverImageUrl = `https:${rawUrl}`;
                    } else {
                        // If it doesn't have a protocol, log a warning but keep it
                        // It might be a relative path or malformed, handle display errors later
                        console.warn(`Cover image URL might be malformed: ${rawUrl}`);
                        coverImageUrl = rawUrl;
                    }
                }
            }

            // Extract data, providing defaults for missing fields
            const extractedData = {
                isbn: cleanedIsbn,
                title: bookData.title || 'N/A',
                authors: bookData.authors || [],
                coverImageUrl: coverImageUrl, // Use the corrected URL
                synopsis: bookData.description || '',
                publisher: bookData.publisher || '',
                publicationYear: bookData.publishedDate ? bookData.publishedDate.substring(0, 4) : '',
                pageCount: bookData.pageCount || null,
                apiGenres: bookData.categories || [],
                apiSeriesTitle: '', // Placeholder
                apiSeriesNumber: '', // Placeholder
            };

            console.log("Extracted data from API:", extractedData);
            return extractedData;

        } catch (error) {
            console.error("Error fetching or parsing book data:", error);
            return null;
        }
    }

    // --- Event Handlers ---

    /**
     * Handles the click on the ISBN Lookup button OR barcode scan result.
     * @param {string} [scannedIsbn] - Optional ISBN value passed from scanner.
     */
    async function handleIsbnLookup(scannedIsbn) {
        let isbn = '';
        // If called with a string arg, it's from the scanner (photo or video)
        if (scannedIsbn && typeof scannedIsbn === 'string') {
            isbn = scannedIsbn;
            console.log(`Handling lookup for detected ISBN: ${isbn}`);
        } else if (isbnManualInput) { // Otherwise, assume manual button click
            isbn = isbnManualInput.value.trim();
            console.log(`Handling lookup for manual ISBN: ${isbn}`);
        }

        if (!isbn) {
            alert("Please enter, take photo of, or select image with an ISBN.");
            return;
        }

        console.log(`Looking up ISBN: ${isbn}`);
        if (scanStatusElement) scanStatusElement.textContent = `Looking up ${isbn}...`;

        const bookData = await fetchBookDataByISBN(isbn);

        hideIsbnInputModal(); // Hide the input modal

        if (bookData) {
            console.log("ISBN lookup successful.");
            prefillAndShowAddBookForm(bookData);
        } else {
            console.log("ISBN lookup failed or book not found.");
            alert(`Could not find book details for ISBN ${isbn}. Please enter the details manually.`);
            showAddBookModal();
        }
    }

    /** Handles the submission of the Add Book form */
    function handleAddBookSubmit(event) {
        event.preventDefault();
        console.log("Add book form submitted");

        const formData = new FormData(addBookForm);
        const getValue = (key, defaultValue = '') => formData.get(key) || defaultValue;
        const getNumberValue = (key, defaultValue = null) => {
            const val = formData.get(key);
            return (val !== null && val !== '') ? parseFloat(val) : defaultValue;
        };
        const getArrayValue = (key) => {
            const val = formData.get(key);
            return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
        };

        // Basic validation
        const title = getValue('title');
        const authors = getValue('authors');
        const reader = formData.get('reader');
        const status = formData.get('status');

        if (!title || !authors || !reader || !status) {
            alert('Please fill in all required fields (*).');
            return;
        }

        // --- Corrected Book Object Creation with API Data Merging ---
        const newBook = new Book(
            // Use API data if available, otherwise form data (or defaults)
            currentlyFetchedApiData?.isbn || getValue('isbn'),
            title, // Always use title from form (user might edit)
            getArrayValue('authors'), // Always use authors from form (user might edit)
            currentlyFetchedApiData?.coverImageUrl || '',
            currentlyFetchedApiData?.synopsis || '',
            currentlyFetchedApiData?.publisher || '',
            currentlyFetchedApiData?.publicationYear || '',
            currentlyFetchedApiData?.pageCount || null, // API page count (base)
            currentlyFetchedApiData?.apiGenres || [],
            currentlyFetchedApiData?.apiSeriesTitle || '',
            currentlyFetchedApiData?.apiSeriesNumber || '',

            // User Managed Fields from form:
            reader,
            status,
            getNumberValue('personalRating'),
            new Date().toISOString(), // dateAdded (always new)
            getValue('dateFinished') || null,
            getArrayValue('userGenres'),
            getArrayValue('customTags'),
            getValue('notes'),
            getValue('userSeriesTitle'), // User series title override
            getValue('userSeriesNumber'),// User series number override
            // User page count override (use if entered, otherwise default null)
            getNumberValue('userPageCount'),
            null // userCoverImage (TODO: Still need to handle file upload saving)
        );

        console.log("New book created:", newBook);

        // Add to the main list and save
        allBooks.push(newBook);
        saveBooksToStorage(allBooks);

        // Clean up and update UI
        currentlyFetchedApiData = null; // Clear the temp API data
        renderBooks();
        hideAddBookModal();
    }

    // --- Data Handling ---

    /** Clears all book data from storage and memory */
    function resetAllData() {
        // Confirmation dialog
        const isConfirmed = confirm("Are you sure you want to delete ALL book data? This cannot be undone.");

        if (isConfirmed) {
            try {
                localStorage.removeItem(STORAGE_KEY);
                allBooks = []; // Clear the in-memory array
                currentlyFetchedApiData = null; // Clear any pending API data
                console.log("All book data cleared.");
                renderBooks(); // Re-render to show empty state
                alert("Bookshelf data has been reset.");
            } catch (error) {
                console.error("Error clearing data:", error);
                alert("An error occurred while trying to reset data.");
            }
        } else {
            console.log("Data reset cancelled by user.");
        }
    }

    // --- Initial Setup --- (Moved inside DOMContentLoaded)
    console.log("Running initial setup inside DOMContentLoaded.");

    // Check Essential Elements
    if (!bookDisplayArea) {
        console.error("Essential UI element #book-display-area not found. Aborting.");
        return; // Stop if critical element missing
    }
    // Add other checks if needed (e.g., for addBookButton)
    if (!addBookButton) {
        console.warn("#add-book-btn not found. Cannot add books.");
    }
    // ... add checks for other essential buttons/containers if desired ...

    // Add Event Listeners
    if (viewToggleButton) {
        viewToggleButton.textContent = `View: ${currentView === 'grid' ? 'List' : 'Grid'}`; // Set initial text here
        viewToggleButton.addEventListener('click', toggleView);
    }
    if (addBookButton && isbnInputContainer) {
         addBookButton.addEventListener('click', showIsbnInputModal);
    } else if (addBookButton) {
         // Fallback if ISBN container fails for some reason? Or just warn.
         console.warn("Add book button found, but ISBN input container might be missing.");
    }
    if (isbnLookupButton) {
        // Pass no argument for manual lookup
        isbnLookupButton.addEventListener('click', () => handleIsbnLookup());
    }
    if (cancelIsbnInputButton) {
        cancelIsbnInputButton.addEventListener('click', hideIsbnInputModal);
    }
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBookSubmit);
    }
    if (cancelAddBookButton) {
        cancelAddBookButton.addEventListener('click', hideAddBookModal);
    }
    if (resetDataButton) {
        resetDataButton.addEventListener('click', resetAllData);
    }
    if (barcodePhotoInput) {
        barcodePhotoInput.addEventListener('change', handlePhotoSelected);
    }

    // Load Data and Initial Render
    allBooks = loadBooksFromStorage();
    console.log(`Loaded ${allBooks.length} books from storage.`);
    renderBooks(); // Initial render

}); // End of DOMContentLoaded listener

// Removed initialization code from here

// End of script 