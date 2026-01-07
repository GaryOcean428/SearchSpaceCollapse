"""
Tavily MCP Bridge

Bridges Tavily MCP server calls to the insight validator.
This allows the validator to use Tavily MCP when available.

MCP Server: https://mcp.tavily.com/mcp/?tavilyApiKey=<key>
Tools: tavily-search, tavily-extract, tavily-map, tavily-crawl
"""

import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class TavilyMCPBridge:
    """
    Bridge to Tavily MCP server.
    
    This class provides a unified interface to Tavily's MCP tools,
    abstracting the MCP communication layer.
    """
    
    def __init__(self, mcp_client=None):
        """
        Initialize MCP bridge.
        
        Args:
            mcp_client: MCP client instance (if available)
        """
        self.mcp_client = mcp_client
        self.available = mcp_client is not None
        
        if not self.available:
            logger.warning("Tavily MCP client not provided - MCP tools unavailable")
    
    def search(
        self,
        query: str,
        search_depth: str = "advanced",
        max_results: int = 10,
        include_answer: bool = True,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Execute Tavily search via MCP.
        
        Args:
            query: Search query
            search_depth: "basic", "advanced", "fast", or "ultra-fast"
            max_results: Maximum number of results (1-20)
            include_answer: Include AI-generated answer
            include_domains: Whitelist domains
            exclude_domains: Blacklist domains
            
        Returns:
            Search results dict or None if MCP unavailable
        """
        if not self.available:
            logger.warning("Tavily MCP not available")
            return None
        
        try:
            # Build MCP tool call arguments
            arguments = {
                "query": query,
                "search_depth": search_depth,
                "max_results": max_results,
                "include_answer": include_answer
            }
            
            if include_domains:
                arguments["include_domains"] = include_domains
            if exclude_domains:
                arguments["exclude_domains"] = exclude_domains
            
            # Call MCP tool
            # NOTE: This assumes mcp_client has a call_tool method
            # Actual implementation depends on your MCP client
            result = self.mcp_client.call_tool(
                "tavily-search",
                arguments=arguments
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Tavily MCP search error: {e}")
            return None
    
    def extract(
        self,
        url: str,
        extract_depth: str = "advanced"
    ) -> Optional[Dict[str, Any]]:
        """
        Extract content from URL via MCP.
        
        Args:
            url: URL to extract content from
            extract_depth: "basic" or "advanced"
            
        Returns:
            Extracted content dict or None
        """
        if not self.available:
            logger.warning("Tavily MCP not available")
            return None
        
        try:
            result = self.mcp_client.call_tool(
                "tavily-extract",
                arguments={
                    "url": url,
                    "extract_depth": extract_depth
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Tavily MCP extract error: {e}")
            return None
    
    def map_website(
        self,
        url: str,
        max_depth: int = 2,
        limit: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Map website structure via MCP.
        
        Args:
            url: Starting URL
            max_depth: Maximum depth to crawl
            limit: Maximum number of pages
            
        Returns:
            Site map dict or None
        """
        if not self.available:
            logger.warning("Tavily MCP not available")
            return None
        
        try:
            result = self.mcp_client.call_tool(
                "tavily-map",
                arguments={
                    "url": url,
                    "max_depth": max_depth,
                    "limit": limit
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Tavily MCP map error: {e}")
            return None
    
    def crawl(
        self,
        url: str,
        instructions: str,
        max_pages: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Crawl website with instructions via MCP.
        
        Args:
            url: Starting URL
            instructions: Natural language crawling instructions
            max_pages: Maximum pages to crawl
            
        Returns:
            Crawl results dict or None
        """
        if not self.available:
            logger.warning("Tavily MCP not available")
            return None
        
        try:
            result = self.mcp_client.call_tool(
                "tavily-crawl",
                arguments={
                    "url": url,
                    "instructions": instructions,
                    "max_pages": max_pages
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Tavily MCP crawl error: {e}")
            return None


# Singleton instance (set by application)
_tavily_mcp_bridge: Optional[TavilyMCPBridge] = None


def initialize_tavily_mcp(mcp_client) -> TavilyMCPBridge:
    """
    Initialize global Tavily MCP bridge.
    
    Call this during application startup with your MCP client.
    """
    global _tavily_mcp_bridge
    _tavily_mcp_bridge = TavilyMCPBridge(mcp_client)
    logger.info("Tavily MCP bridge initialized")
    return _tavily_mcp_bridge


def get_tavily_mcp() -> Optional[TavilyMCPBridge]:
    """Get the global Tavily MCP bridge instance."""
    return _tavily_mcp_bridge
