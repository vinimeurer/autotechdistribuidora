// Função para carregar os dados do JSON
async function loadMenuData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        // Return the products array, not the whole data object
        return data.produtos;
    } catch (error) {
        console.error('Erro ao carregar os dados:', error);
        return [];  // Return empty array instead of null
    }
}

// Função para renderizar os produtos
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<div class="no-results">Nenhum produto encontrado. Tente outra busca.</div>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        card.innerHTML = `
            <img src="${product.imagem}" alt="${product.nome}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.nome}</h3>
                <span class="product-category">${product.tipo}</span>
            </div>
        `;
        card.addEventListener('click', () => openModal(product));
        container.appendChild(card);
    });
}

// Função para abrir o modal
function openModal(product) {
    const modal = document.getElementById('product-modal');
    const modalBody = modal.querySelector('.modal-body');
    
    // Format codes for modal display
    let codesDisplay = '';
    if (typeof product.codigo === 'string') {
        codesDisplay = `
            <div class="modal-codes-container">
                <span class="modal-code">${product.codigo}</span>
            </div>
        `;
    } else if (Array.isArray(product.codigo)) {
        let codeItems = '';
        product.codigo.forEach(code => {
            codeItems += `<span class="modal-code">${code}</span>`;
        });
        codesDisplay = `<div class="modal-codes-container">${codeItems}</div>`;
    }
    
    modalBody.innerHTML = `
        <img src="${product.imagem}" alt="${product.nome}" class="modal-image">
        <h2 class="modal-title">${product.nome}</h2>
        <span class="modal-category">${product.tipo}</span>
        ${codesDisplay}
        <p class="modal-description">${product.descricao}</p>
    `;
    
    modal.style.display = 'block';
}

// Função para fechar o modal
function closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Função para filtrar produtos por pesquisa
function filterBySearch(products, searchTerm) {
    if (!searchTerm) return products;
    
    searchTerm = searchTerm.toLowerCase();
    
    return products.filter(product => 
        product.nome.toLowerCase().includes(searchTerm) ||
        product.descricao.toLowerCase().includes(searchTerm) ||
        // Handle searching by code - check if codigo is a string or array
        (typeof product.codigo === 'string' && 
            product.codigo.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(product.codigo) && 
            product.codigo.some(code => code.toLowerCase().includes(searchTerm)))
    );
}


// Função para extrair categorias únicas dos produtos
function getUniqueCategories(products) {
    // Filter out products that don't have a tipo property
    const validProducts = products.filter(product => product && product.tipo);
    const categories = validProducts.map(product => product.tipo);
    // Filter out any undefined values just to be safe
    const uniqueCategories = Array.from(new Set(categories)).filter(Boolean);
    return ['all', ...uniqueCategories];
}

// Função para renderizar os botões de filtro
function renderFilterButtons(categories) {
    const filterContainer = document.querySelector('.filter-buttons');
    if (!filterContainer) {
        console.error('Filter container not found');
        return;
    }
    
    filterContainer.innerHTML = '';
    
    categories.forEach(category => {
        if (!category) return; // Skip undefined categories
        
        const button = document.createElement('button');
        button.className = 'filter-button';
        button.setAttribute('data-type', category);
        
        // Set the first button (all) as active
        if (category === 'all') {
            button.classList.add('active');
        }
        
        // Format the display text (capitalize first letter)
        let displayText = 'Todos';
        if (category !== 'all') {
            displayText = category.charAt(0).toUpperCase() + category.slice(1);
            // Only add 's' if the category doesn't already end with 's'
            if (!category.endsWith('s')) {
                displayText += 's';
            }
        }
        
        button.textContent = displayText;
        filterContainer.appendChild(button);
    });
}


// Functions to show/hide loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Impede rolagem enquanto carrega
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'none';
    document.body.style.overflow = ''; // Restaura rolagem
}

// Função para gerar PDF do catálogo
function generateCatalogPDF() {
    showLoading();
    
    loadMenuData().then(products => {
        if (!products || products.length === 0) {
            hideLoading();
            alert('Não foi possível carregar os produtos para o PDF.');
            return;
        }

        // Create a temporary div for PDF content
        const pdfContainer = document.createElement('div');
        pdfContainer.id = 'temp-pdf-content';
        pdfContainer.style.width = '190mm';
        document.body.appendChild(pdfContainer);

        // Add header
        pdfContainer.innerHTML = `
            <div style="margin-bottom: 20px; padding-top: 15px;">
                <p style="color: #333; margin-bottom: 10px; font-size: 28px;">
                    Catálogo de Produtos - Autotech Distribuidora
                </p>
                <p style="color: #666; font-size: 14px;">
                    Data: ${new Date().toLocaleDateString()}
                </p>
                <hr style="margin: 15px 0; border-top: 2px solid #ddd;">
            </div>
        `;

        // Group products by category
        const categories = {};
        products.forEach(product => {
            if (!product.tipo) return;
            
            const category = product.tipo;
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(product);
        });

        // Add each category and its products with controlled pagination
        const categoryNames = Object.keys(categories).sort();
        
        let currentPage = pdfContainer;
        let itemsOnCurrentPage = 0;
        const ITEMS_PER_PAGE = 7;
        
        // Function to create a new page
        function createNewPage() {
            const newPage = document.createElement('div');
            newPage.style.pageBreakBefore = 'always';
            newPage.style.padding = '10mm 0';
            pdfContainer.appendChild(newPage);
            return newPage;
        }
        
        categoryNames.forEach((category, categoryIndex) => {
            const productsInCategory = categories[category];
            
            // For each category, create a category header
            const categoryHeader = document.createElement('div');
            categoryHeader.innerHTML = `
                <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 6px; 
                     margin: 20px 0 15px 0; font-size: 22px;">
                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                </h2>
            `;
            
            // If adding category header would exceed items per page,
            // or if it's not the first category, start a new page
            if (itemsOnCurrentPage > 0 && (itemsOnCurrentPage >= ITEMS_PER_PAGE || categoryIndex > 0)) {
                currentPage = createNewPage();
                itemsOnCurrentPage = 0;
            }
            
            // Add category header to current page
            currentPage.appendChild(categoryHeader);
            
            // Add products for this category
            productsInCategory.forEach((product, productIndex) => {
                // Create codes HTML
                let codesHTML = '';
                if (product.codigo && product.codigo.length) {
                    const codes = Array.isArray(product.codigo) ? product.codigo : [product.codigo];
                    codesHTML = codes.map(code => 
                        `<span style="display: inline-block; background-color: #f0f0f0; padding: 3px 8px; 
                         border-radius: 3px; margin: 2px; font-size: 12px;">Código: ${code}</span>`
                    ).join('');
                }
                
                // Create product item
                const productItem = document.createElement('div');
                productItem.innerHTML = `
                    <div style="display: flex; padding: 8px; border: 1px solid #ddd; border-radius: 5px; 
                         margin-bottom: 10px; height: 105px;">
                        <div style="flex: 0 0 90px; margin-right: 10px;">
                            <img src="${product.imagem}" style="width: 90px; height: 90px; object-fit: contain;" 
                                 alt="${product.nome || 'Produto'}">
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="margin-bottom: 3px; font-size: 15px;">${product.nome || 'Sem nome'}</h3>
                            <p style="color: #666; margin-bottom: 6px; font-size: 13px;">${product.descricao || ''}</p>
                            <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                ${codesHTML}
                            </div>
                        </div>
                    </div>
                `;
                
                // Increment counter
                itemsOnCurrentPage++;
                
                // Add product to current page
                currentPage.appendChild(productItem);
                
                // If we've reached the limit per page and there are more products,
                // start a new page for the next products
                if (itemsOnCurrentPage >= ITEMS_PER_PAGE && 
                   (productIndex < productsInCategory.length - 1 || categoryIndex < categoryNames.length - 1)) {
                    currentPage = createNewPage();
                    itemsOnCurrentPage = 0;
                }
            });
        });

        // Wait for images to load
        setTimeout(() => {
            // Generate PDF with fixed layout
            const opt = {
                margin: [15, 15, 15, 15], // top, right, bottom, left
                filename: 'catalogo-produtos.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    letterRendering: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                }
            };

            html2pdf().from(pdfContainer).set(opt).save().then(() => {
                hideLoading();
                document.body.removeChild(pdfContainer);
            }).catch(err => {
                hideLoading();
                console.error('Erro ao gerar PDF:', err);
                alert('Erro ao gerar o PDF. Verifique o console para mais detalhes.');
                document.body.removeChild(pdfContainer);
            });
        }, 1500);
    }).catch(err => {
        hideLoading();
        console.error('Erro ao carregar dados:', err);
        alert('Erro ao carregar os dados. Verifique o console para mais detalhes.');
    });
}



// Função para inicializar a aplicação
// Função para inicializar a aplicação
async function initializeApp() {
    const products = await loadMenuData();
    if (!products) return;
    
    // Extract unique categories and render filter buttons
    const categories = getUniqueCategories(products);
    renderFilterButtons(categories);
    
    // Render all products initially
    renderProducts(products);
    
    // Setup search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredProducts = filterBySearch(products, searchTerm);
            renderProducts(filteredProducts);
        });
    }
    
    // Setup filter buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-button')) {
            const filterButtons = document.querySelectorAll('.filter-button');
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const filterType = e.target.getAttribute('data-type');
            let filteredProducts = products;
            
            // Filter by category
            if (filterType !== 'all') {
                filteredProducts = products.filter(product => 
                    product.tipo === filterType
                );
            }
            
            // Also apply any existing search filter
            const searchInput = document.getElementById('search-input');
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            if (searchTerm) {
                filteredProducts = filterBySearch(filteredProducts, searchTerm);
            }
            
            renderProducts(filteredProducts);
        }
    });
    
    // Setup PDF download button
    const pdfButton = document.getElementById('download-pdf');
    if (pdfButton) {
        pdfButton.addEventListener('click', generateCatalogPDF);
    }
    
    // Setup modal close button
    const closeButton = document.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

// Iniciar a aplicação quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', initializeApp);