import { Post } from "@/domain/entities/Post";

export interface PostRepository {
  getPostsBySala(idSala: number): Promise<Post[]>;
  createPost(post: Omit<Post, 'id' | 'created_at'>): Promise<Post | null>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<boolean>;
}