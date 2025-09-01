#!/usr/bin/env python3
"""
Searxng File Scraper - Main Entry Point

This script provides a command-line interface for the Searxng file scraper system.
It can run searches, manage instances, and start the API server.
"""

import os
import sys
import asyncio
import click
import logging
from typing import List, Optional
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper.searxng_scraper import SearxngScraper
from database.db_operations import DatabaseOperations
from api.main import app

# Initialize Rich console
console = Console()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format=os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logger = logging.getLogger(__name__)

class SearxngManager:
    """Main manager class for the Searxng scraper system"""
    
    def __init__(self):
        self.db = None
        self._initialize_db()
    
    def _initialize_db(self):
        """Initialize database connection"""
        try:
            self.db = DatabaseOperations()
            if not self.db.test_connection():
                console.print("[red]Failed to connect to database[/red]")
                sys.exit(1)
        except Exception as e:
            console.print(f"[red]Database initialization failed: {e}[/red]")
            sys.exit(1)
    
    def list_instances(self):
        """List all configured Searxng instances"""
        instances = self.db.get_active_instances()
        
        if not instances:
            console.print("[yellow]No instances configured[/yellow]")
            return
        
        table = Table(title="Searxng Instances")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("URL", style="blue")
        table.add_column("Status", style="magenta")
        
        for instance in instances:
            status = "Active" if instance['is_active'] else "Inactive"
            table.add_row(
                instance['id'][:8] + "...",
                instance['name'],
                instance['url'],
                status
            )
        
        console.print(table)
    
    def add_instance(self, name: str, url: str):
        """Add a new Searxng instance"""
        result = self.db.add_instance(name, url)
        if result:
            console.print(f"[green]Successfully added instance: {name}[/green]")
        else:
            console.print(f"[red]Failed to add instance: {name}[/red]")
    
    def test_instance(self, url: str):
        """Test a Searxng instance"""
        console.print(f"Testing instance: {url}")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Testing connection...", total=None)
            
            try:
                scraper = SearxngScraper(url)
                results = scraper.search("test query", page=1)
                
                if results:
                    console.print(f"[green]✓ Instance is working - found {len(results)} results[/green]")
                else:
                    console.print(f"[yellow]⚠ Instance responded but returned no results[/yellow]")
                    
            except Exception as e:
                console.print(f"[red]✗ Instance test failed: {e}[/red]")
    
    def run_search(self, query: str, instances: Optional[List[str]] = None, 
                  max_pages: int = 3, save_results: bool = True):
        """Run a search across specified instances"""
        if instances:
            # Filter instances by name or URL
            all_instances = self.db.get_active_instances()
            target_instances = [
                inst for inst in all_instances 
                if inst['name'] in instances or inst['url'] in instances
            ]
        else:
            target_instances = self.db.get_active_instances()
        
        if not target_instances:
            console.print("[red]No matching instances found[/red]")
            return
        
        console.print(f"Running search: '{query}' across {len(target_instances)} instances")
        
        all_results = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            
            for instance in target_instances:
                task = progress.add_task(f"Searching {instance['name']}...", total=None)
                
                try:
                    scraper = SearxngScraper(instance['url'])
                    results = scraper.search_multiple_pages(query, max_pages)
                    
                    all_results.extend(results)
                    progress.update(task, description=f"✓ {instance['name']} - {len(results)} results")
                    
                except Exception as e:
                    progress.update(task, description=f"✗ {instance['name']} - Error: {str(e)[:50]}")
                    logger.error(f"Search failed for {instance['name']}: {e}")
        
        # Display results summary
        self._display_results_summary(all_results)
        
        # Save results if requested
        if save_results and all_results:
            query_id = self.db.create_search_query(query, target_instances[0]['id'])
            if query_id:
                success = self.db.store_search_results(query_id, all_results)
                if success:
                    self.db.update_search_query(query_id, "completed", len(all_results))
                    console.print(f"[green]Results saved to database (Query ID: {query_id})[/green]")
                else:
                    console.print("[red]Failed to save results to database[/red]")
    
    def _display_results_summary(self, results):
        """Display a summary of search results"""
        if not results:
            console.print("[yellow]No results found[/yellow]")
            return
        
        # Count file types
        file_count = sum(1 for r in results if r.is_file)
        file_types = {}
        domains = {}
        
        for result in results:
            if result.is_file and result.file_type:
                file_types[result.file_type] = file_types.get(result.file_type, 0) + 1
            if result.domain:
                domains[result.domain] = domains.get(result.domain, 0) + 1
        
        # Create summary panel
        summary_text = f"""
[bold]Total Results:[/bold] {len(results)}
[bold]Files Found:[/bold] {file_count}
[bold]Regular Pages:[/bold] {len(results) - file_count}

[bold]Top File Types:[/bold]
"""
        
        for file_type, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:5]:
            summary_text += f"  • {file_type}: {count}\n"
        
        summary_text += "\n[bold]Top Domains:[/bold]\n"
        for domain, count in sorted(domains.items(), key=lambda x: x[1], reverse=True)[:5]:
            summary_text += f"  • {domain}: {count}\n"
        
        console.print(Panel(summary_text, title="Search Results Summary", border_style="green"))
        
        # Show sample results
        if results:
            console.print("\n[bold]Sample Results:[/bold]")
            table = Table()
            table.add_column("Title", style="cyan", max_width=40)
            table.add_column("URL", style="blue", max_width=50)
            table.add_column("Type", style="green")
            table.add_column("Domain", style="magenta")
            
            for result in results[:10]:  # Show first 10 results
                result_type = result.file_type if result.is_file else "webpage"
                table.add_row(
                    result.title[:40] + "..." if len(result.title) > 40 else result.title,
                    result.url[:50] + "..." if len(result.url) > 50 else result.url,
                    result_type or "unknown",
                    result.domain
                )
            
            console.print(table)
    
    def show_statistics(self):
        """Show system statistics"""
        stats = self.db.get_search_statistics()
        file_types = self.db.get_file_types_summary()
        top_domains = self.db.get_top_domains(10)
        recent_queries = self.db.get_recent_queries(5)
        
        # Instance statistics
        if stats:
            table = Table(title="Instance Statistics")
            table.add_column("Instance", style="cyan")
            table.add_column("Total Queries", style="green")
            table.add_column("Completed", style="blue")
            table.add_column("Failed", style="red")
            table.add_column("Total Results", style="magenta")
            table.add_column("Files Found", style="yellow")
            
            for stat in stats:
                table.add_row(
                    stat['instance_name'],
                    str(stat['total_queries']),
                    str(stat['completed_queries']),
                    str(stat['failed_queries']),
                    str(stat['total_results']),
                    str(stat['file_results'])
                )
            
            console.print(table)
        
        # File types summary
        if file_types:
            console.print("\n[bold]File Types Found:[/bold]")
            for ft in file_types[:10]:
                console.print(f"  • {ft['file_type']}: {ft['count']} files")
        
        # Recent queries
        if recent_queries:
            console.print("\n[bold]Recent Queries:[/bold]")
            for query in recent_queries:
                status_color = "green" if query['status'] == 'completed' else "red"
                console.print(f"  • [{status_color}]{query['query_text']}[/{status_color}] ({query['total_results']} results)")

# CLI Commands
@click.group()
def cli():
    """Searxng File Scraper - Find open files across the web"""
    pass

@cli.command()
def list_instances():
    """List all configured Searxng instances"""
    manager = SearxngManager()
    manager.list_instances()

@cli.command()
@click.argument('name')
@click.argument('url')
def add_instance(name, url):
    """Add a new Searxng instance"""
    manager = SearxngManager()
    manager.add_instance(name, url)

@cli.command()
@click.argument('url')
def test_instance(url):
    """Test a Searxng instance"""
    manager = SearxngManager()
    manager.test_instance(url)

@cli.command()
@click.argument('query')
@click.option('--instances', '-i', multiple=True, help='Specific instances to search')
@click.option('--max-pages', '-p', default=3, help='Maximum pages to search per instance')
@click.option('--no-save', is_flag=True, help='Do not save results to database')
def search(query, instances, max_pages, no_save):
    """Run a search across Searxng instances"""
    manager = SearxngManager()
    manager.run_search(query, list(instances) if instances else None, max_pages, not no_save)

@cli.command()
def stats():
    """Show system statistics"""
    manager = SearxngManager()
    manager.show_statistics()

@cli.command()
@click.option('--host', default='0.0.0.0', help='Host to bind to')
@click.option('--port', default=8000, help='Port to bind to')
@click.option('--reload', is_flag=True, help='Enable auto-reload')
def serve(host, port, reload):
    """Start the API server"""
    import uvicorn
    console.print(f"[green]Starting API server on {host}:{port}[/green]")
    uvicorn.run("api.main:app", host=host, port=port, reload=reload)

@cli.command()
@click.option('--days', default=30, help='Delete results older than this many days')
def cleanup(days):
    """Clean up old search results"""
    manager = SearxngManager()
    success = manager.db.delete_old_results(days)
    if success:
        console.print(f"[green]Successfully deleted results older than {days} days[/green]")
    else:
        console.print(f"[red]Failed to delete old results[/red]")

if __name__ == "__main__":
    cli()