import { execAsync } from "ags/process";

export default function PowerButton() {
    return (      
        <button onClicked={() => execAsync("bash -c $HOME/configs/waybar/scripts/power-menu.sh")}>
            <label class="icon" label="⏻" />
        </button>
    )
}