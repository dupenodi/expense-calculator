// Expense Calculator App with Google Sheets Integration
class ExpenseCalculator {
    constructor() {
        this.expenses = [];
        this.searchTerm = '';
        this.sheetId = localStorage.getItem('sheetId');
        this.webAppUrl = localStorage.getItem('webAppUrl');
        this.isOnline = navigator.onLine;
        
        // Load data and initialize
        this.loadData();
        this.initializeEventListeners();
        this.updateDisplay();
        
        // Set up online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Load data from Google Sheets or localStorage
    async loadData() {
        if (!this.webAppUrl) {
            this.showSetupCard();
            return;
        }

        try {
            if (this.isOnline) {
                await this.loadFromGoogleSheets();
            } else {
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.log('Failed to load from Google Sheets, using localStorage');
            this.loadFromLocalStorage();
        }
    }

    // Load expenses from localStorage (fallback)
    loadFromLocalStorage() {
        const stored = localStorage.getItem('expenses');
        this.expenses = stored ? JSON.parse(stored) : [];
    }

    // Load from Google Sheets via Web App
    async loadFromGoogleSheets() {
        if (!this.webAppUrl) return;
        
        try {
            const response = await fetch(`${this.webAppUrl}?action=get`);
            const data = await response.json();
            
            if (data.success) {
                this.expenses = data.expenses || [];
                this.saveToLocalStorage(); // Keep local backup
            }
        } catch (error) {
            console.log('Error loading from Google Sheets:', error);
            this.loadFromLocalStorage();
        }
    }

    // Save expenses to localStorage
    saveToLocalStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    // Save to Google Sheets via Web App
    async saveToGoogleSheets(expense) {
        if (!this.webAppUrl || !this.isOnline) return false;
        
        try {
            // Use GET request with URL parameters to avoid CORS issues with POST
            const params = new URLSearchParams({
                action: 'add',
                id: expense.id,
                description: expense.description,
                amount: expense.amount,
                paidBy: expense.paidBy,
                date: expense.date,
                splitType: expense.splitType,
                sharathPercent: expense.sharathPercent,
                thejasPercent: expense.thejasPercent,
                category: expense.category,
                timestamp: expense.timestamp
            });
            
            const response = await fetch(`${this.webAppUrl}?${params.toString()}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.log('Error saving to Google Sheets:', error);
            return false;
        }
    }

    // Show setup card for first-time users
    showSetupCard() {
        const setupCard = document.getElementById('setup-card');
        const mainContent = document.querySelectorAll('.balance-card, .quick-add-card, .expense-form-card, .summary-card, .expenses-card');
        
        setupCard.style.display = 'block';
        mainContent.forEach(card => card.style.display = 'none');
        
        // Update setup instructions
        this.updateSetupInstructions();
    }

    // Update setup instructions
    updateSetupInstructions() {
        const setupCard = document.getElementById('setup-card');
        setupCard.innerHTML = `
            <h3>🔗 Connect to Google Sheets</h3>
            <p>To share expenses with Thejas, we need to set up a Google Apps Script:</p>
            <div class="setup-steps">
                <div class="step">
                    <strong>Step 1:</strong> <a href="https://script.google.com/create" target="_blank">Create a Google Apps Script</a>
                </div>
                <div class="step">
                    <strong>Step 2:</strong> Copy and paste the provided script code
                </div>
                <div class="step">
                    <strong>Step 3:</strong> Deploy as web app and get the URL
                </div>
                <div class="step">
                    <strong>Step 4:</strong> Paste the web app URL below
                </div>
            </div>
            <div class="setup-form">
                <input type="text" id="webapp-url" placeholder="Paste Google Apps Script Web App URL here..." />
                <button id="connect-webapp" class="btn-primary">Connect</button>
            </div>
            <div class="setup-help">
                <button id="show-script" class="btn-secondary">Show Script Code</button>
                <button id="skip-setup" class="btn-secondary">Skip - Use Local Only</button>
            </div>
        `;
        
        // Add event listeners for new buttons
        document.getElementById('connect-webapp').addEventListener('click', () => this.connectToWebApp());
        document.getElementById('show-script').addEventListener('click', () => this.showScriptCode());
        document.getElementById('skip-setup').addEventListener('click', () => this.skipSetup());
    }

    // Show Google Apps Script code
    showScriptCode() {
        const scriptCode = `
// Google Apps Script for Expense Calculator
// IMPORTANT: This script must be bound to a Google Spreadsheet!
// Go to sheets.google.com, create a new sheet, then Extensions > Apps Script

function doGet(e) {
  // Handle CORS
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Get or create the spreadsheet
    let sheet;
    try {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    } catch (error) {
      // If no active spreadsheet, create one
      const spreadsheet = SpreadsheetApp.create('Expense Calculator Data');
      sheet = spreadsheet.getActiveSheet();
      sheet.setName('Expenses');
    }
    
    if (e.parameter.action === 'get') {
      const data = sheet.getDataRange().getValues();
      const expenses = [];
      
      // Skip header row if it exists
      const startRow = data.length > 0 && data[0][0] === 'ID' ? 1 : 0;
      
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (row[0]) { // If ID exists
          expenses.push({
            id: row[0],
            description: row[1] || '',
            amount: parseFloat(row[2]) || 0,
            paidBy: row[3] || '',
            date: row[4] || '',
            splitType: row[5] || 'equal',
            sharathPercent: parseInt(row[6]) || 50,
            thejasPercent: parseInt(row[7]) || 50,
            category: row[8] || 'other',
            timestamp: row[9] || ''
          });
        }
      }
      
      return output.setContent(JSON.stringify({
        success: true, 
        expenses: expenses.reverse() // Most recent first
      }));
    }
    
    // Handle add expense via GET request (to avoid CORS issues)
    if (e.parameter.action === 'add') {
      // Add header if sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'ID', 'Description', 'Amount', 'Paid By', 'Date', 
          'Split Type', 'Sharath %', 'Thejas %', 'Category', 'Timestamp'
        ]);
      }
      
      // Add expense row from URL parameters
      sheet.appendRow([
        e.parameter.id || '',
        e.parameter.description || '',
        parseFloat(e.parameter.amount) || 0,
        e.parameter.paidBy || '',
        e.parameter.date || '',
        e.parameter.splitType || 'equal',
        parseInt(e.parameter.sharathPercent) || 50,
        parseInt(e.parameter.thejasPercent) || 50,
        e.parameter.category || 'other',
        e.parameter.timestamp || ''
      ]);
      
      return output.setContent(JSON.stringify({
        success: true,
        message: 'Expense added successfully'
      }));
    }
    
    // Test endpoint
    if (e.parameter.action === 'test') {
      return output.setContent(JSON.stringify({
        success: true, 
        message: 'Connection successful!',
        timestamp: new Date().toISOString()
      }));
    }
    
    return output.setContent(JSON.stringify({
      success: false, 
      error: 'Invalid action'
    }));
    
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false, 
      error: error.toString()
    }));
  }
}

// Note: doPost function removed - using GET requests only to avoid CORS issues
        `;
        
        // Create modal to show script
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <h3>Google Apps Script Code</h3>
                <p style="margin: 16px 0; color: #666;">Copy this code and paste it into your Google Apps Script:</p>
                <textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px; border: 1px solid #ddd; padding: 12px; border-radius: 4px;">${scriptCode}</textarea>
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="navigator.clipboard.writeText(\`${scriptCode.replace(/`/g, '\\`')}\`); alert('Code copied to clipboard!')" style="margin-right: 12px; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Copy Code</button>
                    <button onclick="document.body.removeChild(this.closest('div').parentElement)" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 14px;">
                    <strong>IMPORTANT - Follow these steps exactly:</strong><br><br>
                    <strong>Method 1 (Recommended):</strong><br>
                    1. Go to <a href="https://sheets.google.com" target="_blank">sheets.google.com</a><br>
                    2. Create a new blank spreadsheet<br>
                    3. Go to "Extensions" → "Apps Script"<br>
                    4. Replace the default code with the code above<br>
                    5. Click "Deploy" → "New deployment"<br>
                    6. Choose "Web app" type<br>
                    7. Set "Execute as" to "Me" and "Who has access" to "Anyone"<br>
                    8. Click "Deploy" and copy the web app URL<br><br>
                    
                    <strong>Method 2 (Alternative):</strong><br>
                    1. Go to <a href="https://script.google.com/create" target="_blank">script.google.com/create</a><br>
                    2. Replace the default code with the code above<br>
                    3. The script will auto-create a spreadsheet when first used<br>
                    4. Deploy as web app (steps 5-8 above)
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Skip setup and use local storage only
    skipSetup() {
        this.hideSetupCard();
        this.showNotification('Using local storage only. Export data to share with Thejas.');
    }

    // Hide setup card and show main content
    hideSetupCard() {
        const setupCard = document.getElementById('setup-card');
        const mainContent = document.querySelectorAll('.balance-card, .quick-add-card, .expense-form-card, .summary-card, .expenses-card');
        
        setupCard.style.display = 'none';
        mainContent.forEach(card => card.style.display = 'block');
    }

    // Connect to Google Apps Script Web App
    async connectToWebApp() {
        const webAppUrlInput = document.getElementById('webapp-url');
        const webAppUrl = webAppUrlInput.value.trim();
        
        if (!webAppUrl) {
            alert('Please enter a Google Apps Script Web App URL');
            return;
        }
        
        try {
            // Test connection first
            const testResponse = await fetch(`${webAppUrl}?action=test`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!testResponse.ok) {
                throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
            }
            
            const testData = await testResponse.json();
            
            if (testData.success) {
                // Save web app URL
                this.webAppUrl = webAppUrl;
                localStorage.setItem('webAppUrl', webAppUrl);
                
                // Load existing data
                await this.loadFromGoogleSheets();
                this.hideSetupCard();
                this.updateDisplay();
                
                this.showNotification('Successfully connected to Google Sheets!');
            } else {
                throw new Error(testData.error || 'Connection test failed');
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            
            let errorMessage = 'Could not connect to Google Apps Script.\n\n';
            
            if (error.message.includes('CORS')) {
                errorMessage += 'CORS Error: Make sure your Google Apps Script is:\n';
                errorMessage += '1. Deployed as a web app\n';
                errorMessage += '2. Access set to "Anyone"\n';
                errorMessage += '3. Using the latest deployment\n\n';
            } else if (error.message.includes('404')) {
                errorMessage += 'URL not found. Please check:\n';
                errorMessage += '1. The URL is correct\n';
                errorMessage += '2. The script is properly deployed\n\n';
            } else {
                errorMessage += 'Please check:\n';
                errorMessage += '1. The URL is correct\n';
                errorMessage += '2. The script is deployed as a web app\n';
                errorMessage += '3. Access is set to "Anyone"\n';
                errorMessage += '4. You have internet connection\n\n';
            }
            
            errorMessage += `Error details: ${error.message}`;
            alert(errorMessage);
        }
    }

    // Sync data (reload from Google Sheets)
    async syncData() {
        if (this.webAppUrl && this.isOnline) {
            try {
                await this.loadFromGoogleSheets();
                this.updateDisplay();
                this.showNotification('Data synced!');
            } catch (error) {
                console.log('Sync failed:', error);
            }
        }
    }

    // Initialize event listeners
    initializeEventListeners() {
        const form = document.getElementById('expense-form');
        const exportBtn = document.getElementById('export-btn');
        const clearBtn = document.getElementById('clear-btn');
        const splitTypeSelect = document.getElementById('split-type');
        const searchInput = document.getElementById('search-expenses');
        const quickButtons = document.querySelectorAll('.quick-btn');
        const datePaid = document.getElementById('date-paid');

        // Set today's date as default
        if (datePaid) datePaid.valueAsDate = new Date();

        // Main app event listeners
        if (form) form.addEventListener('submit', (e) => this.handleAddExpense(e));
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAllExpenses());
        if (splitTypeSelect) splitTypeSelect.addEventListener('change', (e) => this.handleSplitTypeChange(e));
        if (searchInput) searchInput.addEventListener('input', (e) => this.handleSearch(e));
        
        // Quick add buttons
        quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAdd(e));
        });
        
        // Custom split percentage validation
        const sharathPercent = document.getElementById('sharath-percent');
        const thejasPercent = document.getElementById('thejas-percent');
        
        if (sharathPercent && thejasPercent) {
            sharathPercent.addEventListener('input', () => {
                thejasPercent.value = 100 - parseInt(sharathPercent.value || 0);
            });
            
            thejasPercent.addEventListener('input', () => {
                sharathPercent.value = 100 - parseInt(thejasPercent.value || 0);
            });
        }
    }

    // Handle adding new expense
    async handleAddExpense(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const paidBy = document.getElementById('paid-by').value;
        const datePaid = document.getElementById('date-paid').value;
        const splitType = document.getElementById('split-type').value;
        
        let sharathPercent = 50;
        let thejasPercent = 50;
        
        // Handle different split types
        if (splitType === '60-40') {
            if (paidBy === 'sharath') {
                sharathPercent = 60; thejasPercent = 40;
            } else {
                sharathPercent = 40; thejasPercent = 60;
            }
        } else if (splitType === '40-60') {
            if (paidBy === 'sharath') {
                sharathPercent = 40; thejasPercent = 60;
            } else {
                sharathPercent = 60; thejasPercent = 40;
            }
        } else if (splitType === '70-30') {
            if (paidBy === 'sharath') {
                sharathPercent = 70; thejasPercent = 30;
            } else {
                sharathPercent = 30; thejasPercent = 70;
            }
        } else if (splitType === '30-70') {
            if (paidBy === 'sharath') {
                sharathPercent = 30; thejasPercent = 70;
            } else {
                sharathPercent = 70; thejasPercent = 30;
            }
        } else if (splitType === 'custom') {
            sharathPercent = parseInt(document.getElementById('sharath-percent').value) || 50;
            thejasPercent = parseInt(document.getElementById('thejas-percent').value) || 50;
            
            if (sharathPercent + thejasPercent !== 100) {
                alert('Percentages must add up to 100%');
                return;
            }
        }

        if (!description || !amount || !paidBy || !datePaid) {
            alert('Please fill in all fields');
            return;
        }

        const expense = {
            id: Date.now().toString(),
            description,
            amount,
            paidBy,
            date: datePaid,
            splitType,
            sharathPercent,
            thejasPercent,
            category: this.getCategoryFromDescription(description),
            timestamp: new Date().toISOString()
        };

        // Add to local array
        this.expenses.unshift(expense);
        this.saveToLocalStorage();
        
        // Try to save to Google Sheets
        if (this.webAppUrl && this.isOnline) {
            const saved = await this.saveToGoogleSheets(expense);
            if (saved) {
                this.showNotification('Expense added and synced to Google Sheets!');
            } else {
                this.showNotification('Expense added locally. Will sync when connection is restored.');
            }
        } else {
            this.showNotification('Expense added locally. Connect to Google Sheets to sync.');
        }
        
        this.updateDisplay();
        
        // Reset form
        e.target.reset();
        document.getElementById('date-paid').valueAsDate = new Date();
        document.getElementById('split-type').value = 'equal';
        this.handleSplitTypeChange({ target: { value: 'equal' } });
    }

    // Calculate balances
    calculateBalances() {
        let sharathTotal = 0;
        let thejasTotal = 0;
        let sharathPaid = 0;
        let thejasPaid = 0;

        this.expenses.forEach(expense => {
            const amount = expense.amount;
            const sharathPercent = expense.sharathPercent || 50;
            const thejasPercent = expense.thejasPercent || 50;
            
            // Calculate split amounts based on percentages
            const sharathSplit = (amount * sharathPercent) / 100;
            const thejasSplit = (amount * thejasPercent) / 100;

            // Add to total expenses for each person
            sharathTotal += sharathSplit;
            thejasTotal += thejasSplit;

            // Track who paid what
            if (expense.paidBy === 'sharath') {
                sharathPaid += amount;
            } else {
                thejasPaid += amount;
            }
        });

        // Calculate net balances (what each person owes/is owed)
        const sharathBalance = sharathPaid - sharathTotal;
        const thejasBalance = thejasPaid - thejasTotal;

        return {
            sharath: sharathBalance,
            thejas: thejasBalance,
            sharathPaid,
            thejasPaid,
            totalExpenses: sharathTotal + thejasTotal,
            sharathTotal,
            thejasTotal
        };
    }

    // Update display
    updateDisplay() {
        this.updateBalanceDisplay();
        this.updateExpensesList();
        this.updateSummaryStats();
    }

    // Update balance display
    updateBalanceDisplay() {
        const balances = this.calculateBalances();
        
        const sharathBalanceEl = document.getElementById('sharath-balance');
        const thejasBalanceEl = document.getElementById('thejas-balance');
        const settlementEl = document.getElementById('settlement');

        if (!sharathBalanceEl || !thejasBalanceEl || !settlementEl) return;

        // Update balance amounts
        sharathBalanceEl.textContent = `₹${Math.abs(balances.sharath).toFixed(2)}`;
        thejasBalanceEl.textContent = `₹${Math.abs(balances.thejas).toFixed(2)}`;

        // Add positive/negative classes
        sharathBalanceEl.className = 'amount';
        thejasBalanceEl.className = 'amount';

        if (balances.sharath > 0) {
            sharathBalanceEl.classList.add('positive');
        } else if (balances.sharath < 0) {
            sharathBalanceEl.classList.add('negative');
        }

        if (balances.thejas > 0) {
            thejasBalanceEl.classList.add('positive');
        } else if (balances.thejas < 0) {
            thejasBalanceEl.classList.add('negative');
        }

        // Update settlement message
        if (Math.abs(balances.sharath) < 0.01) {
            settlementEl.textContent = "All settled up! 🎉";
            settlementEl.className = 'settlement';
        } else if (balances.sharath > 0) {
            settlementEl.textContent = `Thejas owes Sharath ₹${balances.sharath.toFixed(2)}`;
            settlementEl.className = 'settlement';
        } else {
            settlementEl.textContent = `Sharath owes Thejas ₹${Math.abs(balances.sharath).toFixed(2)}`;
            settlementEl.className = 'settlement';
        }
    }

    // Update expenses list
    updateExpensesList() {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;
        
        const filteredExpenses = this.getFilteredExpenses();
        
        if (this.expenses.length === 0) {
            expensesList.innerHTML = '<div class="no-expenses">No expenses added yet</div>';
            return;
        }
        
        if (filteredExpenses.length === 0 && this.searchTerm) {
            expensesList.innerHTML = '<div class="no-expenses">No expenses match your search</div>';
            return;
        }

        const expensesHTML = filteredExpenses.map(expense => {
            const splitInfo = this.getSplitInfo(expense);
            const categoryIcon = this.getCategoryIcon(expense.category);
            
            return `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-details">
                    <div class="expense-description">
                        <span class="expense-icon">${categoryIcon}</span>
                        ${expense.description}
                        <span class="split-indicator">${splitInfo}</span>
                    </div>
                    <div class="expense-meta">
                        Paid by ${expense.paidBy === 'sharath' ? 'Sharath' : 'Thejas'} • ${this.formatDate(expense.date)}
                    </div>
                </div>
                <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button class="btn-small btn-edit" onclick="app.editExpense('${expense.id}')">Edit</button>
                    <button class="btn-small btn-delete" onclick="app.deleteExpense('${expense.id}')">Delete</button>
                </div>
            </div>
        `}).join('');

        expensesList.innerHTML = expensesHTML;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    // Edit expense
    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        const newDescription = prompt('Edit description:', expense.description);
        if (newDescription === null) return;

        const newAmount = prompt('Edit amount (₹):', expense.amount);
        if (newAmount === null) return;

        const parsedAmount = parseFloat(newAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const newPaidBy = prompt('Paid by (sharath/thejas):', expense.paidBy);
        if (newPaidBy === null) return;

        if (newPaidBy !== 'sharath' && newPaidBy !== 'thejas') {
            alert('Please enter either "sharath" or "thejas"');
            return;
        }

        // Update expense
        expense.description = newDescription.trim();
        expense.amount = parsedAmount;
        expense.paidBy = newPaidBy;
        expense.category = this.getCategoryFromDescription(newDescription);

        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('Expense updated locally. Refresh to sync with Google Sheets.');
    }

    // Delete expense
    deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('Expense deleted locally. Refresh to sync with Google Sheets.');
    }

    // Export data
    exportData() {
        const data = {
            expenses: this.expenses,
            exportDate: new Date().toISOString(),
            balances: this.calculateBalances()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `expense-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Data exported successfully!');
    }

    // Clear all expenses
    clearAllExpenses() {
        if (!confirm('Are you sure you want to clear all expenses? This cannot be undone.')) return;

        this.expenses = [];
        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('All expenses cleared!');
    }
    
    // Handle split type change
    handleSplitTypeChange(e) {
        const customSplitDiv = document.getElementById('custom-split');
        if (!customSplitDiv) return;
        
        if (e.target.value === 'custom') {
            customSplitDiv.style.display = 'grid';
            customSplitDiv.classList.add('show');
        } else {
            customSplitDiv.style.display = 'none';
            customSplitDiv.classList.remove('show');
        }
    }
    
    // Handle quick add buttons
    handleQuickAdd(e) {
        const description = e.target.dataset.desc;
        const amount = e.target.dataset.amount;
        
        document.getElementById('description').value = description;
        document.getElementById('amount').value = amount;
        document.getElementById('description').focus();
    }
    
    // Handle search
    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateExpensesList();
    }
    
    // Get filtered expenses based on search
    getFilteredExpenses() {
        if (!this.searchTerm) return this.expenses;
        
        return this.expenses.filter(expense => 
            expense.description.toLowerCase().includes(this.searchTerm) ||
            expense.paidBy.toLowerCase().includes(this.searchTerm) ||
            expense.category.toLowerCase().includes(this.searchTerm)
        );
    }
    
    // Get category from description
    getCategoryFromDescription(description) {
        const desc = description.toLowerCase();
        if (desc.includes('rent')) return 'rent';
        if (desc.includes('electric') || desc.includes('power')) return 'electricity';
        if (desc.includes('wifi') || desc.includes('internet')) return 'wifi';
        if (desc.includes('water')) return 'water';
        if (desc.includes('cook') || desc.includes('maid')) return 'cook';
        if (desc.includes('grocer') || desc.includes('food') || desc.includes('meal')) return 'groceries';
        if (desc.includes('transport') || desc.includes('uber') || desc.includes('auto')) return 'transport';
        if (desc.includes('medical') || desc.includes('doctor') || desc.includes('medicine')) return 'medical';
        return 'other';
    }
    
    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            rent: '🏠',
            electricity: '⚡',
            wifi: '🌐',
            water: '💧',
            cook: '🍳',
            groceries: '🛒',
            transport: '🚗',
            medical: '🏥',
            other: '💰'
        };
        return icons[category] || icons.other;
    }
    
    // Get split information
    getSplitInfo(expense) {
        if (expense.sharathPercent === 50 && expense.thejasPercent === 50) {
            return '50/50';
        }
        return `${expense.sharathPercent || 50}/${expense.thejasPercent || 50}`;
    }
    
    // Update summary statistics
    updateSummaryStats() {
        const balances = this.calculateBalances();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Filter expenses for current month
        const monthExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear;
        });
        
        const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const daysInMonth = new Date().getDate();
        const dailyAvg = monthTotal / daysInMonth;
        
        const totalEl = document.getElementById('total-expenses');
        const monthEl = document.getElementById('month-expenses');
        const dailyEl = document.getElementById('daily-avg');
        
        if (totalEl) totalEl.textContent = `₹${balances.totalExpenses.toFixed(2)}`;
        if (monthEl) monthEl.textContent = `₹${monthTotal.toFixed(2)}`;
        if (dailyEl) dailyEl.textContent = `₹${dailyAvg.toFixed(2)}`;
    }

    // Show notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpenseCalculator();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);