import {TavilySearch} from '@langchain/tavily'

export const searchTool = new TavilySearch({
    maxResults: 5,
    topic:'general',
    includeAnswer: true,
    includeImages: false,
});

export const imageSearchTool = new TavilySearch({
    maxResults: 5,
    topic:'general',
    includeAnswer: true,
    includeImages: true,
});