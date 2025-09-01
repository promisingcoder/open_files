-- Enable PGroonga extension for full-text search
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- Create searxng_instances table to store configured search instances
CREATE TABLE searxng_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_queries table to track executed queries
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    instance_id UUID REFERENCES searxng_instances(id) ON DELETE CASCADE,
    page_number INTEGER DEFAULT 1,
    total_results INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create search_results table to store scraped results
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    domain VARCHAR(255),
    engines TEXT[], -- Array of search engines that returned this result
    cached_url TEXT,
    position INTEGER, -- Position in search results
    page_number INTEGER DEFAULT 1,
    is_file BOOLEAN DEFAULT false, -- Flag to identify if result is a file
    file_type VARCHAR(50), -- pdf, doc, xls, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_search_results_query_id ON search_results(query_id);
CREATE INDEX idx_search_results_domain ON search_results(domain);
CREATE INDEX idx_search_results_is_file ON search_results(is_file);
CREATE INDEX idx_search_results_file_type ON search_results(file_type);
CREATE INDEX idx_search_queries_instance_id ON search_queries(instance_id);
CREATE INDEX idx_search_queries_status ON search_queries(status);

-- Create PGroonga indexes for full-text search
CREATE INDEX idx_search_results_title_pgroonga ON search_results USING pgroonga(title);
CREATE INDEX idx_search_results_description_pgroonga ON search_results USING pgroonga(description);
CREATE INDEX idx_search_results_url_pgroonga ON search_results USING pgroonga(url);

-- Create a combined full-text search index
CREATE INDEX idx_search_results_fulltext_pgroonga ON search_results 
USING pgroonga((title || ' ' || COALESCE(description, '') || ' ' || url));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for searxng_instances
CREATE TRIGGER update_searxng_instances_updated_at 
    BEFORE UPDATE ON searxng_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default searxng instances
INSERT INTO searxng_instances (name, url) VALUES 
    ('Priv.au', 'https://priv.au'),
    ('Search.brave.com', 'https://search.brave.com'),
    ('Searx.be', 'https://searx.be'),
    ('Search.sapti.me', 'https://search.sapti.me');

-- Create view for search statistics
CREATE VIEW search_statistics AS
SELECT 
    si.name as instance_name,
    si.url as instance_url,
    COUNT(sq.id) as total_queries,
    COUNT(CASE WHEN sq.status = 'completed' THEN 1 END) as completed_queries,
    COUNT(CASE WHEN sq.status = 'failed' THEN 1 END) as failed_queries,
    COUNT(sr.id) as total_results,
    COUNT(CASE WHEN sr.is_file = true THEN 1 END) as file_results
FROM searxng_instances si
LEFT JOIN search_queries sq ON si.id = sq.instance_id
LEFT JOIN search_results sr ON sq.id = sr.query_id
GROUP BY si.id, si.name, si.url;

-- Create function for full-text search
CREATE OR REPLACE FUNCTION search_results_fulltext(search_term TEXT)
RETURNS TABLE(
    id UUID,
    title TEXT,
    url TEXT,
    description TEXT,
    domain VARCHAR(255),
    engines TEXT[],
    cached_url TEXT,
    is_file BOOLEAN,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.title,
        sr.url,
        sr.description,
        sr.domain,
        sr.engines,
        sr.cached_url,
        sr.is_file,
        sr.file_type,
        sr.created_at,
        pgroonga_score(tableoid, ctid) as rank
    FROM search_results sr
    WHERE (sr.title || ' ' || COALESCE(sr.description, '') || ' ' || sr.url) &@~ search_term
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies (Row Level Security)
ALTER TABLE searxng_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can customize this based on your needs)
CREATE POLICY "Allow all for authenticated users" ON searxng_instances
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON search_queries
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON search_results
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access for anonymous users
CREATE POLICY "Allow read for anonymous users" ON searxng_instances
    FOR SELECT USING (true);

CREATE POLICY "Allow read for anonymous users" ON search_queries
    FOR SELECT USING (true);

CREATE POLICY "Allow read for anonymous users" ON search_results
    FOR SELECT USING (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;