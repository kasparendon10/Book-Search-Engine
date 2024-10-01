let searchTimeout;

document.getElementById('search-input').addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value;
    if (query.length >= 4) {
        searchTimeout = setTimeout(() => {
            const author = document.getElementById('author-input').value;
            const language = document.getElementById('language-select').value;
            const category = document.getElementById('category-select').value;
            clearResults();
            searchBooks(query, author, language, category);
        }, 300);
    }
});

document.getElementById('author-input').addEventListener('input', triggerSearch);
document.getElementById('language-select').addEventListener('change', triggerSearch);
document.getElementById('category-select').addEventListener('change', triggerSearch);

function triggerSearch() {
    const query = document.getElementById('search-input').value;
    if (query.length >= 4) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const author = document.getElementById('author-input').value;
            const language = document.getElementById('language-select').value;
            const category = document.getElementById('category-select').value;
            clearResults();
            searchBooks(query, author, language, category);
        }, 300);
    }
}

function clearResults() {
    document.getElementById('results').innerHTML = '';
}

function searchBooks(query, author, language, category) {
    const apis = [
        { name: 'Google Books', url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${author ? '+inauthor:' + encodeURIComponent(author) : ''}${language ? '&langRestrict=' + language : ''}${category ? '+subject:' + encodeURIComponent(category) : ''}` },
        { name: 'Open Library', url: `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}${author ? '+author:' + encodeURIComponent(author) : ''}${category ? '&subject=' + category : ''}` },
        { name: 'Project Gutenberg', url: `https://gutendex.com/books?search=${encodeURIComponent(query)}${author ? '&author=' + encodeURIComponent(author) : ''}` },
        { name: 'ISBNdb', url: `https://api2.isbndb.com/book/${encodeURIComponent(query)}${author ? '+author:' + encodeURIComponent(author) : ''}` },
        { name: 'Book Depository', url: `https://api.bookdepository.com/v1/search?q=${encodeURIComponent(query)}${author ? '+author:' + encodeURIComponent(author) : ''}` },
        { name: 'WorldCat', url: `https://www.worldcat.org/search?q=${encodeURIComponent(query)}${author ? '+author:' + encodeURIComponent(author) : ''}&format=json` },
        { name: 'Library Genesis', url: `https://libgen.is/search.php?req=${encodeURIComponent(query)}${author ? '&author=' + encodeURIComponent(author) : ''}` },
        { name: 'BookBrainz', url: `https://bookbrainz.org/api/search?q=${encodeURIComponent(query)}${author ? '+author:' + encodeURIComponent(author) : ''}` },
    ];

    Promise.all(apis.map(api => 
        fetch(api.url)
            .then(response => response.json())
            .then(data => ({ name: api.name, data: data }))
            .catch(error => console.error('Error fetching data:', error))
    )).then(results => {
        let allItems = [];
        results.forEach(result => {
            if (result && result.data) {
                allItems = allItems.concat(processApiData(result.name, result.data));
            }
        });
        allItems.sort((a, b) => {
            if (a.isComplete && a.isFree && (!b.isComplete || !b.isFree)) return -1;
            if (b.isComplete && b.isFree && (!a.isComplete || !a.isFree)) return 1;
            return 0;
        });
        displayResults(allItems);
    });
}

function processApiData(apiName, data) {
    let items = [];

    switch (apiName) {
        case 'Google Books':
            items = data.items.map(item => ({
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors,
                description: item.volumeInfo.description,
                imageUrl: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : null,
                link: item.volumeInfo.infoLink,
                isComplete: item.accessInfo.accessViewStatus === 'FULL',
                isFree: item.saleInfo.saleability === 'FREE'
            }));
            break;
        case 'Open Library':
            items = data.docs.map(doc => ({
                title: doc.title,
                authors: doc.author_name,
                description: doc.first_sentence ? doc.first_sentence[0] : null,
                imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                link: `https://openlibrary.org${doc.key}`,
                isComplete: true,
                isFree: true
            }));
            break;
        case 'Project Gutenberg':
            items = data.results.map(result => ({
                title: result.title,
                authors: result.authors.map(author => author.name),
                description: null,
                imageUrl: null,
                link: `https://www.gutenberg.org/ebooks/${result.id}`,
                isComplete: true,
                isFree: true
            }));
            break;
        // Add cases for other APIs as needed
    }

    return items;
}

function displayResults(items) {
    const resultsContainer = document.getElementById('results');
    items.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        resultItem.innerHTML = `
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ''}
            <div class="result-item-content">
                <h3>${item.title}</h3>
                ${item.authors ? `<p>By ${item.authors.join(', ')}</p>` : ''}
                ${item.description ? `<p>${item.description.substring(0, 100)}...</p>` : ''}
                <p class="availability">
                    ${item.isComplete ? 'Complete' : 'Incomplete'} | 
                    ${item.isFree ? 'Free' : 'Paid'}
                </p>
                <a href="${item.link}" target="_blank">View Book</a>
            </div>
        `;
        resultsContainer.appendChild(resultItem);
    });
}