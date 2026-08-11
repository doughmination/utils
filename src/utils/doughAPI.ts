import axios, { AxiosInstance } from 'axios';

/**
 * API Client for Doughmination Website
 * Handles authentication and requests to the backend API
 */
class DoughAPIClient {
    private client: AxiosInstance;
    private token: string;
    private baseURL: string;

    constructor() {
        this.token = process.env.DOUGH_API_TOKEN || '';
        this.baseURL = 'https://doughmination.uk/v2/plural';

        if (!this.token) {
            console.error('WARNING: DOUGH_API_TOKEN not set in .env file!');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'User-Agent': 'CloveShortcuts/1.0.0',
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
    }

    /**
     * Test the connection to the API
     */
    async healthCheck(): Promise<{ status: string; authenticated: boolean }> {
        try {
            const response = await this.client.get('/bot/health');
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Health check failed: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get system information
     */
    async getSystemInfo(): Promise<any> {
        try {
            const response = await this.client.get('/bot/system/info');
            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to get system info: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get all members
     */
    async getMembers(): Promise<any[]> {
        try {
            const response = await this.client.get('/bot/members');
            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to get members: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get current fronters
     */
    async getFronters(): Promise<any> {
        try {
            const response = await this.client.get('/bot/fronters');
            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to get fronters: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Switch to multiple fronters at once (recommended method)
     * This matches the behavior of the SwitchManager panel
     */
    async multiSwitch(memberIds: string[]): Promise<{ status: string; message: string; fronters: any[]; count: number }> {
        try {
            const response = await this.client.post('/bot/switch', {
                member_ids: memberIds
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to switch fronters: ${error.response?.data?.detail || error.message}`);
            }
            throw error;
        }
    }
}

// Export singleton instance
export const doughAPI = new DoughAPIClient();
