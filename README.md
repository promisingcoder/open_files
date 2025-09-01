# open_files

<img width="1918" height="876" alt="image" src="https://github.com/user-attachments/assets/92e00571-5493-4295-9f0d-9d7e37a04ec2" />


<img width="1918" height="872" alt="image" src="https://github.com/user-attachments/assets/9932b4f6-ce05-42f9-bbd4-d0756ca65171" />

<img width="1917" height="872" alt="image" src="https://github.com/user-attachments/assets/fa8272cd-ecdb-4f47-82bb-777a4473bf37" />

<img width="1918" height="797" alt="image" src="https://github.com/user-attachments/assets/6210db85-ac0c-4b1e-b3c0-f666ee41cc6b" />

<img width="1917" height="792" alt="image" src="https://github.com/user-attachments/assets/79e6f202-bdc0-4bbb-89da-ce45893ea47d" />




A comprehensive web scraping system that searches for open files (Google Docs, Google Drive, PDFs, etc.) across multiple Searxng instances and provides a modern web interface for managing searches and viewing results.

## 🚀 Features

- **Multi-Instance Search**: Query multiple Searxng instances simultaneously
- **File Type Detection**: Automatically identifies and categorizes different file types with case-insensitive filtering
- **Google Services Integration**: Special detection for Google Docs and Google Drive files
- **Advanced Filtering**: Filter results by file type, domain, date range, and more
- **Full-Text Search**: Powered by PostgreSQL's PGronga extension
- **Real-Time Statistics**: Analytics dashboard with charts and insights
- **RESTful API**: Complete API for programmatic access
- **Modern UI**: React-based frontend with Material-UI components and auto-dismissing notifications
- **Database Storage**: Persistent storage with Supabase/PostgreSQL
- **Configurable**: Manage Searxng instances and search parameters
- **Enhanced UX**: Improved notification system with automatic fade-away and better user feedback

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │ Supabase/PostgreSQL │
│                 │◄──►│                 │◄──►│                 │
│ - Search UI     │    │ - API Endpoints │    │ - Data Storage  │
│ - Results View  │    │ - Scraper Logic │    │ - Full-text Search │
│ - Statistics    │    │ - Background Tasks │  │ - Analytics     │
│ - Instance Mgmt │    │ - Rate Limiting │    │ - Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Searxng Instances │
                       │                 │
                       │ - Instance 1    │
                       │ - Instance 2    │
                       │ - Instance N    │
                       └─────────────────┘
```

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- Supabase account (or PostgreSQL with PGronga extension)
- Git

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/promisingcoder/open_files.git
cd searxng-file-scraper
```

### 2. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set SUPABASE_URL and SUPABASE_KEY
```

### 3. Database Setup

#### Option A: Using Supabase (Recommended)

1. Create a new Supabase project
2. Copy the project URL and anon key and your_service_role_key to your `.env` file
3. Run the migration in supabase sql editor



### 4. Frontend Setup

```bash
cd frontend
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:8000" > .env
```

## 🚀 Running the Application

### Development Mode

1. **Start the Backend**:
```bash
# From project root
python main.py api
# or
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Start the Frontend**:
```bash
cd frontend
npm start
```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Production Mode

1. **Build the Frontend**:
```bash
cd frontend
npm run build
```

2. **Run the Backend**:
```bash
python main.py api --host 0.0.0.0 --port 8000
```

## 📖 Usage

### Command Line Interface

```bash
# List available commands
python main.py --help

# Add a Searxng instance
python main.py add-instance "My Instance" "https://searx.example.com"

# List instances
python main.py list-instances

# Run a search
python main.py search "filetype:pdf site:edu" --max-pages 3

# Show statistics
python main.py stats

# Clean up old results
python main.py cleanup --days 30
```

### Web Interface

1. **Dashboard**: Overview of system status and recent activity
2. **Search**: Create new searches with advanced options
3. **Results**: Browse and filter search results
4. **Instances**: Manage Searxng instances
5. **Statistics**: View analytics and insights

### API Usage

```python
import requests

# Start a search
response = requests.post('http://localhost:8000/api/search', json={
    'query': 'filetype:pdf machine learning',
    'max_pages': 2,
    'language': 'en'
})

# Get results
response = requests.get('http://localhost:8000/api/results', params={
    'page': 1,
    'per_page': 20,
    'file_type': 'pdf'
})
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_KEY` | Supabase anon key | Required |
| `API_HOST` | API server host | `localhost` |
| `API_PORT` | API server port | `8000` |
| `SCRAPER_DELAY` | Delay between requests (seconds) | `1.0` |
| `SCRAPER_MAX_PAGES` | Default max pages per search | `5` |
| `SCRAPER_LANGUAGE` | Default search language | `en` |
| `DATABASE_CLEANUP_DAYS` | Days to keep old results | `30` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Searxng Instance Configuration

Add Searxng instances through:
- Web interface (Instances page)
- CLI: `python main.py add-instance`
- Direct database insertion

## 📊 Database Schema

### Tables

- **searxng_instances**: Searxng instance configurations
- **search_queries**: Search query records
- **search_results**: Individual search results

### Key Features

- UUID primary keys
- Full-text search with PGronga
- Automatic timestamps
- Row Level Security (RLS)
- Optimized indexes

## 🔍 Search Features

### Supported File Types

- PDF documents
- Microsoft Office files (DOC, DOCX, XLS, XLSX, PPT, PPTX)
- Google Docs and Sheets
- Text files
- Archives (ZIP, RAR)
- Images and media files

### Search Operators

- `filetype:pdf` - Search for specific file types
- `site:edu` - Search within specific domains
- `"exact phrase"` - Exact phrase matching
- `intitle:keyword` - Search in titles
- `inurl:keyword` - Search in URLs

### Advanced Filters

- **Case-Insensitive File Type Filtering**: Filter by file types regardless of case (e.g., 'PDF', 'pdf', 'Pdf' all work)
- **Domain Filtering**: Filter results by specific domains or websites
- **Date Range Filtering**: Filter results by publication or discovery date
- **Google Docs/Drive Filtering**: Specifically filter for Google Workspace documents
- **Full-Text Content Search**: Search within document content using PostgreSQL's advanced search capabilities

## 📈 Analytics

The system provides comprehensive analytics:

- Search volume trends
- File type distribution
- Top domains
- Instance performance
- Success rates
- Response times

## 🛡️ Security

- Environment-based configuration
- Rate limiting
- Input validation
- SQL injection prevention
- CORS configuration
- Row Level Security (RLS)

## 🧪 Testing

```bash
# Run backend tests
pytest

# Run frontend tests
cd frontend
npm test

# Test database connection
python main.py test-db

# Test Searxng instances
python main.py test-instances
```

## 🚀 Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up a production database
2. Configure environment variables
3. Build the frontend
4. Deploy with a reverse proxy (nginx)
5. Set up process management (systemd, PM2)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Supabase credentials
   - Verify network connectivity
   - Ensure PGronga extension is enabled

2. **Searxng Instance Not Responding**
   - Verify instance URL
   - Check if instance is accessible
   - Review rate limiting settings

3. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

4. **Search Results Empty**
   - Check Searxng instance configuration
   - Verify search query syntax
   - Review instance logs

5. **File Type Filters Not Working**
   - File type filtering is now case-insensitive (fixed in v2.1.0)
   - Try different case variations if using older cached data
   - Clear browser cache and refresh the page

6. **Notifications Not Disappearing**
   - Notifications now auto-dismiss after 5 seconds (fixed in v2.1.0)
   - Persistent notifications with actions require user interaction
   - Check browser console for any JavaScript errors

### Logs

```bash
# View application logs
tail -f logs/app.log

# View API logs
tail -f logs/api.log

# View scraper logs
tail -f logs/scraper.log
```

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review existing issues

## 🔄 Updates

### Recent Updates (v2.1.0)

- **Fixed Case-Sensitive File Type Filtering**: File type filters now work regardless of case
- **Enhanced Notification System**: Added auto-dismiss functionality for better UX
- **Improved Error Handling**: Better error messages and user feedback
- **UI/UX Improvements**: Enhanced notification behavior and user interactions

### To Update the Application

1. Pull latest changes
2. Update dependencies
3. Run database migrations
4. Rebuild frontend
5. Restart services

```bash
git pull origin main
pip install -r requirements.txt
cd frontend && npm install
npm run build
```

### Breaking Changes

None in v2.1.0 - all updates are backward compatible.

---

**Built with ❤️ using FastAPI, React, and Supabase**
