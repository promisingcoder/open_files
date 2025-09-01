<img width="1918" height="876" alt="image" src="https://github.com/user-attachments/assets/92e00571-5493-4295-9f0d-9d7e37a04ec2" />


<img width="1918" height="872" alt="image" src="https://github.com/user-attachments/assets/9932b4f6-ce05-42f9-bbd4-d0756ca65171" />

<img width="1917" height="872" alt="image" src="https://github.com/user-attachments/assets/fa8272cd-ecdb-4f47-82bb-777a4473bf37" />

<img width="1918" height="797" alt="image" src="https://github.com/user-attachments/assets/6210db85-ac0c-4b1e-b3c0-f666ee41cc6b" />

<img width="1917" height="792" alt="image" src="https://github.com/user-attachments/assets/79e6f202-bdc0-4bbb-89da-ce45893ea47d" />

# Open Files

A tool that searches for **open files** (Google Docs, Google Drive, PDFs, etc.) using multiple **Searxng instances**, with a **web interface** to view results.

---

## 🚀 Features

* Search across multiple Searxng instances at once
* Detect & filter file types (PDF, DOC, Google Docs, etc.)
* Web dashboard to manage searches & results
* PostgreSQL / Supabase for storage
* REST API for automation
* Basic statistics & analytics

---

## 🏗️ Tech Stack

* **Frontend:** React
* **Backend:** FastAPI
* **Database:** PostgreSQL / Supabase
* **Search Engine:** Multiple Searxng instances

---

## ⚡ Quick Setup
#### quick note : run the 20240101000001_initial_schema.sql file in supabase's sql editor before anything to initialize the db

### 1. Clone the Project

```bash
git clone https://github.com/promisingcoder/open_files.git
cd open_files
```

### 2. Backend Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env → add SUPABASE_URL & SUPABASE_KEY
```

### 3. Database

* ** Supabase** → create a project,run the migrations file in the migrations directory, copy URL & keys to `.env`


### 4. Frontend Setup

```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000" > .env
```

---

## ▶️ Run the App

### Start Backend

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend

```bash
cd frontend
npm start
```

### Access

* Frontend: **[http://localhost:3000](http://localhost:3000)**
* Backend API: **[http://localhost:8000](http://localhost:8000)**
* API Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 🌐 Web Interface

* **Dashboard** → overview & system status
* **Search** → create new searches
* **Results** → browse & filter results
* **Instances** → manage Searxng servers
* **Statistics** → trends & analytics

---

## 🔌 API Example

```python
import requests

# Start a search
requests.post('http://localhost:8000/api/search', json={
  "query": "filetype:pdf machine learning",
  "max_pages": 2,
  "language": "en"
})

# Get results
requests.get('http://localhost:8000/api/results', params={
  "page": 1,
  "per_page": 20,
  "file_type": "pdf"
})
```

---

## 🛠️ Common Issues

* **DB not working?** → Check Supabase credentials & pgronga
* **No results?** → Verify query + Searxng instance availability
* **Frontend errors?** → Delete `node_modules`, reinstall, check `.env`
* **File filter not working?** → Clear cache (case-insensitivity fixed v2.1.0)

---

## 📌 Updates (v2.1.0)

* File type filtering is **case-insensitive**
* Notifications auto-dismiss after 5s
* Improved error messages
* Better UI/UX

---

## 📖 Contributing

1. Fork & branch
2. Add your feature
3. Write tests
4. Open a PR

---

## 📜 License

MIT License

