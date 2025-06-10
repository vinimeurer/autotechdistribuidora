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
            // if (!category.endsWith('s')) {
            //     displayText += 's';
            // }
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
    
    loadMenuData().then(async (products) => {
        if (!products || products.length === 0) {
            hideLoading();
            alert('Não foi possível carregar os produtos para o PDF.');
            return;
        }
        
        // Correctly initialize jsPDF
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Get page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const usableWidth = pageWidth - 2 * margin;
        
        // Helper function to convert image URL to base64
        const getImageAsBase64 = async (imageUrl) => {
            try {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg'));
                    };
                    img.onerror = () => {
                        reject(new Error('Failed to load image'));
                    };
                    img.src = imageUrl;
                });
            } catch (error) {
                console.error('Error loading image:', error);
                return null;
            }
        };

        // Add cover page
        pdf.setFontSize(28);
        pdf.text('Catálogo de Produtos', pageWidth / 2, 80, { align: 'center' });
        pdf.setFontSize(20);
        pdf.text('Autotech Distribuidora', pageWidth / 2, 100, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`Data: ${new Date().toLocaleDateString()}`, pageWidth / 2, 120, { align: 'center' });
        
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
        
        // Process each category
        let currentCategory = 0;
        const categoryNames = Object.keys(categories).sort();
        
        // Process all categories one by one
        for (const category of categoryNames) {
            // Add new page for each category (except first one on page 2)
            if (currentCategory > 0 || currentCategory === 0) {
                pdf.addPage();
            }
            
            let currentY = margin;
            
            // Add category header
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(category.charAt(0).toUpperCase() + category.slice(1), margin, currentY);
            currentY += 8;
            
            // Draw a line
            pdf.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;
            
            // Process products in this category
            pdf.setFont(undefined, 'normal');
            
            for (const product of categories[category]) {
                // Define product section height (estimate based on content)
                const productSectionHeight = 40; // Approx height for product block
                
                // Check if we need a new page - leave 30mm margin at bottom
                if (currentY + productSectionHeight > pageHeight - 30) {
                    pdf.addPage();
                    currentY = margin;
                    
                    // Add category continuation header
                    pdf.setFontSize(16);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`${category.charAt(0).toUpperCase() + category.slice(1)} (cont.)`, margin, currentY);
                    currentY += 8;
                    
                    // Draw a line
                    pdf.line(margin, currentY, pageWidth - margin, currentY);
                    currentY += 10;
                    pdf.setFont(undefined, 'normal');
                }
                
                // Starting Y position for this product
                const productStartY = currentY;
                
                // Try to load and add the image
                try {
                    // Load image as base64
                    const imageData = await getImageAsBase64(product.imagem);
                    
                    if (imageData) {
                        // Calculate image dimensions while maintaining aspect ratio
                        const imgWidth = 25; // mm - fixed width
                        const imgHeight = 25; // mm - fixed height for consistency
                        
                        // Add image to PDF
                        pdf.addImage(
                            imageData, 
                            'JPEG', 
                            margin, 
                            currentY, 
                            imgWidth, 
                            imgHeight
                        );
                    }
                } catch (error) {
                    console.error('Error adding image for product:', product.nome, error);
                }
                
                // Product name - positioned to the right of image
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(product.nome || 'Sem nome', margin + 30, currentY + 5);
                
                // Product codes
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                
                let codeText = 'Código: ';
                if (typeof product.codigo === 'string') {
                    codeText += product.codigo;
                } else if (Array.isArray(product.codigo)) {
                    codeText += product.codigo.join(', ');
                }
                
                pdf.text(codeText, margin + 30, currentY + 12);
                
                // Description (truncated)
                if (product.descricao) {
                    const maxChars = 100;
                    const description = product.descricao.length > maxChars ? 
                        product.descricao.substring(0, maxChars) + '...' : product.descricao;
                    
                    pdf.setFontSize(9);
                    const textLines = pdf.splitTextToSize(description, usableWidth - 35); // Account for image width
                    pdf.text(textLines, margin + 30, currentY + 19);
                }
                
                // Move down for next product - at least the height of the image plus spacing
                currentY += 35;
                
                // Draw a separator line
                pdf.setDrawColor(200, 200, 200); // Light gray
                pdf.line(margin, currentY, pageWidth - margin, currentY);
                pdf.setDrawColor(0, 0, 0); // Reset to black
                
                // Add spacing after separator
                currentY += 7;
            }
            
            currentCategory++;
        }
        
        // Save the PDF
        pdf.save('catalogo-produtos.pdf');
        hideLoading();
        
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