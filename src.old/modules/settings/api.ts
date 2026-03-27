import { moduleGet, modulePost } from "../../core/api/client";

export interface DisplaySettings {
  theme: string;
  themes: string[];       
  thread_allow: number;
  update_interval: number;
  itemspage: number;
  no_smilies: number;
  title_tosource: number;
  start_menu: number;
  user_scalable: number;
}

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  return moduleGet<DisplaySettings>("settings/display?format=json");
}

export async function saveDisplaySettings(data: Partial<DisplaySettings>): Promise<void> {
  await modulePost("settings/display?format=json", data);
}
