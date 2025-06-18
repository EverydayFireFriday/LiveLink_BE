import { UserModel } from "../../models/user";
import { User } from "../../types/auth/authTypes";

export class UserService {
  private userModel: UserModel | null = null;

  // UserModel을 지연 초기화하는 함수
  private getUserModel(): UserModel {
    if (!this.userModel) {
      this.userModel = new UserModel();
    }
    return this.userModel;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await this.getUserModel().findByEmail(email)) as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (await this.getUserModel().findByUsername(username)) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return (await this.getUserModel().findById(id)) as User | null;
  }

  async createUser(userData: {
    email: string;
    username: string;
    passwordHash: string;
    profileImage?: string;
  }): Promise<User> {
    return (await this.getUserModel().createUser(userData)) as User;
  }

  async updateUser(
    id: string,
    updateData: Partial<User>
  ): Promise<User | null> {
    return (await this.getUserModel().updateUser(
      id,
      updateData
    )) as User | null;
  }

  async generateUsername(
    email: string,
    baseUsername?: string
  ): Promise<string> {
    let username = baseUsername || email.split("@")[0];
    username = username.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();

    if (username.length < 2) username = "user";
    if (username.length > 15) username = username.substring(0, 15);

    let finalUsername = username;
    let counter = 1;

    while (await this.findByUsername(finalUsername)) {
      finalUsername = `${username}${counter}`;
      counter++;

      if (counter > 9999) {
        finalUsername = `${username}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return finalUsername;
  }

  async getAllUsers(limit: number = 50, skip: number = 0): Promise<User[]> {
    return (await this.getUserModel().findAllUsers(limit, skip)) as User[];
  }

  async countUsers(): Promise<number> {
    return await this.getUserModel().countUsers();
  }
}
