import os
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class SearxngInstanceConfig:
    """Configuration for a Searxng instance"""
    name: str
    url: str
    is_active: bool = True
    description: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit_delay: float = 1.0
    custom_headers: Optional[Dict[str, str]] = None
    priority: int = 1  # Higher number = higher priority
    tags: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.custom_headers is None:
            self.custom_headers = {}
        if self.tags is None:
            self.tags = []

@dataclass
class ScraperConfig:
    """Configuration for the scraper behavior"""
    default_delay: float = 1.0
    max_pages: int = 5
    default_language: str = 'en'
    default_safesearch: int = 1
    timeout: int = 30
    max_retries: int = 3
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    concurrent_requests: int = 3
    respect_robots_txt: bool = True
    
@dataclass
class DatabaseConfig:
    """Configuration for database operations"""
    cleanup_days: int = 30
    max_results_per_page: int = 50
    batch_size: int = 100
    connection_pool_size: int = 10
    query_timeout: int = 30
    enable_fulltext_search: bool = True
    
@dataclass
class APIConfig:
    """Configuration for the API server"""
    host: str = 'localhost'
    port: int = 8000
    reload: bool = False
    workers: int = 1
    cors_origins: List[str] = None
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    enable_docs: bool = True
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ['http://localhost:3000']

@dataclass
class LoggingConfig:
    """Configuration for logging"""
    level: str = 'INFO'
    format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    enable_console: bool = True
    enable_file: bool = True

class ConfigManager:
    """Manages application configuration"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or os.path.join(os.getcwd(), 'config.json')
        self.config_dir = Path(self.config_file).parent
        self.config_dir.mkdir(exist_ok=True)
        
        # Initialize default configurations
        self.scraper = ScraperConfig()
        self.database = DatabaseConfig()
        self.api = APIConfig()
        self.logging = LoggingConfig()
        self.instances: List[SearxngInstanceConfig] = []
        
        # Load configuration from file and environment
        self.load_config()
        self.load_from_env()
        
    def load_config(self) -> None:
        """Load configuration from JSON file"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    
                # Load scraper config
                if 'scraper' in config_data:
                    self.scraper = ScraperConfig(**config_data['scraper'])
                    
                # Load database config
                if 'database' in config_data:
                    self.database = DatabaseConfig(**config_data['database'])
                    
                # Load API config
                if 'api' in config_data:
                    self.api = APIConfig(**config_data['api'])
                    
                # Load logging config
                if 'logging' in config_data:
                    self.logging = LoggingConfig(**config_data['logging'])
                    
                # Load instances
                if 'instances' in config_data:
                    self.instances = [
                        SearxngInstanceConfig(**instance)
                        for instance in config_data['instances']
                    ]
                    
                logger.info(f"Configuration loaded from {self.config_file}")
                
            except Exception as e:
                logger.error(f"Error loading configuration: {e}")
                logger.info("Using default configuration")
        else:
            logger.info("No configuration file found, using defaults")
            
    def load_from_env(self) -> None:
        """Load configuration from environment variables"""
        # Scraper configuration
        if os.getenv('SCRAPER_DELAY'):
            self.scraper.default_delay = float(os.getenv('SCRAPER_DELAY'))
        if os.getenv('SCRAPER_MAX_PAGES'):
            self.scraper.max_pages = int(os.getenv('SCRAPER_MAX_PAGES'))
        if os.getenv('SCRAPER_LANGUAGE'):
            self.scraper.default_language = os.getenv('SCRAPER_LANGUAGE')
        if os.getenv('SCRAPER_SAFESEARCH'):
            self.scraper.default_safesearch = int(os.getenv('SCRAPER_SAFESEARCH'))
        if os.getenv('SCRAPER_USER_AGENT'):
            self.scraper.user_agent = os.getenv('SCRAPER_USER_AGENT')
            
        # Database configuration
        if os.getenv('DATABASE_CLEANUP_DAYS'):
            self.database.cleanup_days = int(os.getenv('DATABASE_CLEANUP_DAYS'))
        if os.getenv('DATABASE_MAX_RESULTS_PER_PAGE'):
            self.database.max_results_per_page = int(os.getenv('DATABASE_MAX_RESULTS_PER_PAGE'))
        if os.getenv('DATABASE_BATCH_SIZE'):
            self.database.batch_size = int(os.getenv('DATABASE_BATCH_SIZE'))
            
        # API configuration
        if os.getenv('API_HOST'):
            self.api.host = os.getenv('API_HOST')
        if os.getenv('API_PORT'):
            self.api.port = int(os.getenv('API_PORT'))
        if os.getenv('API_RELOAD'):
            self.api.reload = os.getenv('API_RELOAD').lower() == 'true'
        if os.getenv('API_WORKERS'):
            self.api.workers = int(os.getenv('API_WORKERS'))
        if os.getenv('CORS_ORIGINS'):
            self.api.cors_origins = os.getenv('CORS_ORIGINS').split(',')
            
        # Logging configuration
        if os.getenv('LOG_LEVEL'):
            self.logging.level = os.getenv('LOG_LEVEL')
        if os.getenv('LOG_FILE'):
            self.logging.file_path = os.getenv('LOG_FILE')
            
        # Default instances from environment
        default_instances = os.getenv('DEFAULT_SEARXNG_INSTANCES')
        if default_instances and not self.instances:
            try:
                instances_data = json.loads(default_instances)
                self.instances = [
                    SearxngInstanceConfig(**instance)
                    for instance in instances_data
                ]
            except Exception as e:
                logger.error(f"Error parsing default instances: {e}")
                
    def save_config(self) -> None:
        """Save current configuration to JSON file"""
        try:
            config_data = {
                'scraper': asdict(self.scraper),
                'database': asdict(self.database),
                'api': asdict(self.api),
                'logging': asdict(self.logging),
                'instances': [asdict(instance) for instance in self.instances],
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False)
                
            logger.info(f"Configuration saved to {self.config_file}")
            
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
            
    def add_instance(self, instance: SearxngInstanceConfig) -> None:
        """Add a new Searxng instance"""
        # Check if instance with same URL already exists
        for existing in self.instances:
            if existing.url == instance.url:
                raise ValueError(f"Instance with URL {instance.url} already exists")
                
        self.instances.append(instance)
        self.save_config()
        logger.info(f"Added new instance: {instance.name} ({instance.url})")
        
    def remove_instance(self, url: str) -> bool:
        """Remove a Searxng instance by URL"""
        for i, instance in enumerate(self.instances):
            if instance.url == url:
                removed = self.instances.pop(i)
                self.save_config()
                logger.info(f"Removed instance: {removed.name} ({removed.url})")
                return True
        return False
        
    def update_instance(self, url: str, **kwargs) -> bool:
        """Update a Searxng instance"""
        for instance in self.instances:
            if instance.url == url:
                for key, value in kwargs.items():
                    if hasattr(instance, key):
                        setattr(instance, key, value)
                self.save_config()
                logger.info(f"Updated instance: {instance.name} ({instance.url})")
                return True
        return False
        
    def get_active_instances(self) -> List[SearxngInstanceConfig]:
        """Get all active Searxng instances"""
        return [instance for instance in self.instances if instance.is_active]
        
    def get_instance_by_url(self, url: str) -> Optional[SearxngInstanceConfig]:
        """Get instance by URL"""
        for instance in self.instances:
            if instance.url == url:
                return instance
        return None
        
    def get_instances_by_tag(self, tag: str) -> List[SearxngInstanceConfig]:
        """Get instances by tag"""
        return [instance for instance in self.instances if tag in instance.tags]
        
    def validate_config(self) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []
        
        # Validate scraper config
        if self.scraper.default_delay < 0:
            issues.append("Scraper delay cannot be negative")
        if self.scraper.max_pages < 1:
            issues.append("Max pages must be at least 1")
        if self.scraper.timeout < 1:
            issues.append("Timeout must be at least 1 second")
            
        # Validate database config
        if self.database.cleanup_days < 1:
            issues.append("Cleanup days must be at least 1")
        if self.database.max_results_per_page < 1:
            issues.append("Max results per page must be at least 1")
            
        # Validate API config
        if not (1 <= self.api.port <= 65535):
            issues.append("API port must be between 1 and 65535")
        if self.api.workers < 1:
            issues.append("API workers must be at least 1")
            
        # Validate instances
        urls = set()
        for instance in self.instances:
            if not instance.url:
                issues.append(f"Instance '{instance.name}' has no URL")
            elif instance.url in urls:
                issues.append(f"Duplicate instance URL: {instance.url}")
            else:
                urls.add(instance.url)
                
            if not instance.name:
                issues.append(f"Instance with URL '{instance.url}' has no name")
                
        return issues
        
    def reset_to_defaults(self) -> None:
        """Reset configuration to defaults"""
        self.scraper = ScraperConfig()
        self.database = DatabaseConfig()
        self.api = APIConfig()
        self.logging = LoggingConfig()
        self.instances = []
        self.save_config()
        logger.info("Configuration reset to defaults")
        
    def export_config(self, file_path: str) -> None:
        """Export configuration to a file"""
        config_data = {
            'scraper': asdict(self.scraper),
            'database': asdict(self.database),
            'api': asdict(self.api),
            'logging': asdict(self.logging),
            'instances': [asdict(instance) for instance in self.instances],
            'exported_at': datetime.now().isoformat(),
            'version': '1.0'
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Configuration exported to {file_path}")
        
    def import_config(self, file_path: str, merge: bool = False) -> None:
        """Import configuration from a file"""
        with open(file_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            
        if not merge:
            # Replace entire configuration
            if 'scraper' in config_data:
                self.scraper = ScraperConfig(**config_data['scraper'])
            if 'database' in config_data:
                self.database = DatabaseConfig(**config_data['database'])
            if 'api' in config_data:
                self.api = APIConfig(**config_data['api'])
            if 'logging' in config_data:
                self.logging = LoggingConfig(**config_data['logging'])
            if 'instances' in config_data:
                self.instances = [
                    SearxngInstanceConfig(**instance)
                    for instance in config_data['instances']
                ]
        else:
            # Merge instances only
            if 'instances' in config_data:
                existing_urls = {instance.url for instance in self.instances}
                for instance_data in config_data['instances']:
                    instance = SearxngInstanceConfig(**instance_data)
                    if instance.url not in existing_urls:
                        self.instances.append(instance)
                        
        self.save_config()
        logger.info(f"Configuration imported from {file_path}")
        
    def get_config_summary(self) -> Dict[str, Any]:
        """Get a summary of current configuration"""
        return {
            'scraper': {
                'default_delay': self.scraper.default_delay,
                'max_pages': self.scraper.max_pages,
                'default_language': self.scraper.default_language,
                'timeout': self.scraper.timeout
            },
            'database': {
                'cleanup_days': self.database.cleanup_days,
                'max_results_per_page': self.database.max_results_per_page,
                'batch_size': self.database.batch_size
            },
            'api': {
                'host': self.api.host,
                'port': self.api.port,
                'cors_origins': self.api.cors_origins
            },
            'instances': {
                'total': len(self.instances),
                'active': len(self.get_active_instances()),
                'inactive': len(self.instances) - len(self.get_active_instances())
            },
            'config_file': self.config_file,
            'last_loaded': datetime.now().isoformat()
        }

# Global configuration instance
config = ConfigManager()

# Convenience functions
def get_config() -> ConfigManager:
    """Get the global configuration instance"""
    return config

def reload_config() -> None:
    """Reload configuration from file and environment"""
    global config
    config.load_config()
    config.load_from_env()
    
def save_config() -> None:
    """Save current configuration"""
    config.save_config()