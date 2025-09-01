# OPEN FILES - USAGE GUIDE

## INTRODUCTION

Welcome to Open Files by promisingcoder! This is a powerful web scraping system that helps you discover and search for open files (PDFs, Google Docs, Microsoft Office documents, etc.) across multiple Searxng instances. The system provides both a modern web interface and command-line tools for comprehensive file discovery.

### What Open Files Does:
- Searches multiple Searxng instances simultaneously for open files
- Automatically detects and categorizes different file types
- Provides advanced filtering by file type, domain, and date
- Offers a modern React-based web interface
- Stores results in a database for persistent access
- Includes analytics and statistics dashboard

### Key Benefits:
- Case-insensitive file type filtering (NEW in v2.1.0)
- Auto-dismissing notifications for better user experience
- Full-text search capabilities
- Real-time analytics and insights
- RESTful API for programmatic access

## QUICK START GUIDE

### Prerequisites
Before you begin, make sure you have:
- Python 3.8 or higher
- Node.js 16 or higher
- A Supabase account (free tier works fine)
- Git installed on your system

### Step 1: Setup the Project

1. Clone the repository:
   git clone https://github.com/promisingcoder/open_files.git
   cd open_files

2. Install Python dependencies:
   pip install -r requirements.txt

3. Setup environment variables:
   - Copy .env.example to .env
   - Edit .env and add your Supabase credentials:
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_KEY=your_supabase_anon_key

4. Initialize the database:
   - Go to your Supabase project at https://supabase.com
   - Navigate to the SQL Editor
   - Copy the contents of `supabase/migrations/20240101000001_initial_schema.sql`
   - Paste the SQL code into the SQL Editor and run it
   - This will create all necessary tables and schema for the application

5. Setup the frontend:
   cd frontend
   npm install
   echo "REACT_APP_API_URL=http://localhost:8000" > .env
   cd ..

### Step 2: Start the Application

1. Start the backend API server:
   python main.py api
   # OR alternatively:
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

2. In a new terminal, start the frontend:
   cd frontend
   npm start

3. Open your browser and go to:
   http://localhost:3000

## USING THE WEB INTERFACE

### Dashboard
- View system overview and recent activity
- Check instance status and performance
- Monitor search statistics

### Creating a Search
1. Click on "Search" in the navigation menu
2. Enter your search query (examples below)
3. Select file types you want to find
4. Set maximum pages to search (default: 5)
5. Choose language preference
6. Click "Start Search"

### Search Query Examples:
- "filetype:pdf machine learning" - Find PDF files about machine learning
- "site:edu filetype:docx" - Find Word documents from educational sites
- "intitle:report filetype:xlsx" - Find Excel files with "report" in the title
- ""climate change" filetype:pptx" - Find PowerPoint files about climate change

### Viewing Results
1. Go to "Results" page
2. Use filters to narrow down results:
   - File Type: pdf, docx, xlsx, pptx, txt, etc. (case-insensitive)
   - Domain: Filter by specific websites
   - Date Range: Filter by discovery date
   - Google Docs/Drive: Show only Google Workspace files
3. Click on any result to open the file
4. Export results as CSV or JSON

### Managing Searxng Instances
1. Go to "Instances" page
2. View current instances and their status
3. Add new instances by clicking "Add Instance"
4. Enable/disable instances as needed
5. Test instance connectivity

### Analytics
- View search volume trends
- See file type distribution
- Check top domains
- Monitor instance performance

## COMMAND LINE USAGE

### Basic Commands

# Show all available commands
python main.py --help

# Add a new Searxng instance
python main.py add-instance "My Instance" "https://searx.example.com"

# List all configured instances
python main.py list-instances

# Run a search from command line
python main.py search "filetype:pdf artificial intelligence" --max-pages 3

# Show system statistics
python main.py stats

# Clean up old search results (older than 30 days)
python main.py cleanup --days 30

# Test database connection
python main.py test-db

# Test all Searxng instances
python main.py test-instances

### Advanced Search Examples

# Search for PDF files from educational institutions
python main.py search "site:edu filetype:pdf" --max-pages 5

# Find Google Docs about a specific topic
python main.py search "site:docs.google.com machine learning" --max-pages 2

# Search for Excel files with specific keywords
python main.py search "filetype:xlsx budget OR financial" --max-pages 3

## API USAGE

### Starting a Search via API

import requests

# Start a new search
response = requests.post('http://localhost:8000/api/search', json={
    'query': 'filetype:pdf machine learning',
    'max_pages': 2,
    'language': 'en',
    'file_types': ['pdf']
})

print(response.json())

### Getting Search Results

# Get paginated results
response = requests.get('http://localhost:8000/api/results', params={
    'page': 1,
    'per_page': 20,
    'file_types': 'pdf,docx',  # Case-insensitive
    'domain': 'edu',
    'search_text': 'machine learning'
})

results = response.json()
print(f"Found {results['total']} results")

### Export Results

# Export as CSV
response = requests.get('http://localhost:8000/api/export', params={
    'format': 'csv',
    'file_types': 'pdf'
})

with open('results.csv', 'wb') as f:
    f.write(response.content)

# Export as JSON
response = requests.get('http://localhost:8000/api/export', params={
    'format': 'json'
})

with open('results.json', 'w') as f:
    f.write(response.text)

## SEARCH OPERATORS AND FILTERS

### File Type Operators
- filetype:pdf - PDF documents
- filetype:doc OR filetype:docx - Word documents
- filetype:xls OR filetype:xlsx - Excel spreadsheets
- filetype:ppt OR filetype:pptx - PowerPoint presentations
- filetype:txt - Text files

### Site and Domain Operators
- site:edu - Educational institutions
- site:gov - Government websites
- site:docs.google.com - Google Docs
- site:drive.google.com - Google Drive

### Content Operators
- "exact phrase" - Search for exact phrase
- intitle:keyword - Search in document titles
- inurl:keyword - Search in URLs
- keyword1 OR keyword2 - Search for either keyword
- keyword1 AND keyword2 - Search for both keywords

### Advanced Filter Combinations
- site:edu filetype:pdf "climate change"
- (filetype:doc OR filetype:docx) intitle:report
- site:drive.google.com "financial analysis"

## TROUBLESHOOTING

### Common Issues and Solutions

1. **"Database connection failed"**
   - Check your Supabase credentials in .env file
   - Verify internet connectivity
   - Ensure Supabase project is active

2. **"No search results found"**
   - Try different search terms
   - Check if Searxng instances are working
   - Verify instance URLs are accessible

3. **"File type filter not working"**
   - File type filtering is now case-insensitive (v2.1.0+)
   - Try clearing browser cache
   - Use different case variations: pdf, PDF, Pdf

4. **"Frontend won't start"**
   - Make sure Node.js 16+ is installed
   - Delete node_modules and run npm install again
   - Check if port 3000 is available

5. **"API server won't start"**
   - Check if port 8000 is available
   - Verify Python dependencies are installed
   - Check .env file configuration

6. **"Notifications not disappearing"**
   - Notifications now auto-dismiss after 5 seconds (v2.1.0+)
   - Persistent notifications require user interaction
   - Check browser console for errors

### Getting Help

- Check the logs in the terminal where you started the servers
- Look for error messages in the browser console (F12)
- Review the full README.md for detailed documentation
- Create an issue on GitHub if you find bugs

## TIPS FOR EFFECTIVE SEARCHING

### Best Practices
1. **Start with specific file types**: Use filetype: operator to narrow results
2. **Use site restrictions**: Limit searches to trusted domains
3. **Combine operators**: Mix filetype, site, and content operators
4. **Use quotes for phrases**: "exact phrase" for precise matches
5. **Try different instances**: Some instances may have different results

### Performance Tips
1. **Limit page count**: Start with 2-3 pages, increase if needed
2. **Use specific queries**: Avoid overly broad search terms
3. **Filter results**: Use the web interface filters to refine results
4. **Regular cleanup**: Remove old results to keep database efficient

### Security Considerations
1. **Verify file sources**: Always check the domain before downloading
2. **Scan downloads**: Use antivirus software on downloaded files
3. **Respect copyright**: Only access publicly available files
4. **Check permissions**: Ensure you have rights to access found files

## CONFIGURATION OPTIONS

### Environment Variables
You can customize the application behavior by editing the .env file:

- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase anonymous key
- API_HOST: API server host (default: localhost)
- API_PORT: API server port (default: 8000)
- SCRAPER_DELAY: Delay between requests in seconds (default: 1.0)
- SCRAPER_MAX_PAGES: Default maximum pages per search (default: 5)
- SCRAPER_LANGUAGE: Default search language (default: en)
- DATABASE_CLEANUP_DAYS: Days to keep old results (default: 30)
- LOG_LEVEL: Logging level (default: INFO)

### Adding More Searxng Instances
To add more Searxng instances for better coverage:

1. Via Web Interface:
   - Go to Instances page
   - Click "Add Instance"
   - Enter name and URL
   - Test connectivity

2. Via Command Line:
   python main.py add-instance "Instance Name" "https://searx.example.com"

3. Popular Public Instances:
   - https://search.inetol.net
   - https://search.rhscz.eu
   - https://searx.be
   - https://searx.info

## UPDATES AND MAINTENANCE

### Keeping the System Updated
1. Pull latest changes: git pull origin main
2. Update Python dependencies: pip install -r requirements.txt
3. Update frontend dependencies: cd frontend && npm install
4. Rebuild frontend: npm run build
5. Restart both servers

### Database Maintenance
- Run cleanup regularly: python main.py cleanup --days 30
- Monitor database size in Supabase dashboard
- Check instance performance: python main.py test-instances

### Recent Updates (v2.1.0)
- Fixed case-sensitive file type filtering
- Enhanced notification system with auto-dismiss
- Improved error handling and user feedback
- Better UI/UX with enhanced notifications

---

This usage guide should help you get started with the Searxng File Scraper. For more detailed technical information, refer to the README.md file. Happy searching!

Last updated: January 2025
Version: 2.1.0