"""No live path fallback or symlink escape in disposable gate runtime."""
import tempfile,unittest
from pathlib import Path
from safe_test_paths import validate_disposable_config

class SafeTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
        self.root=Path(tmp.name)
        self.cfg=self.root/"gate.toml"
    def write(self,body):self.cfg.write_text(body)
    def test_explicit_disposable_database_and_lock(self):
        self.write(f'[gate]\ndatabase="{self.root}/queue.sqlite3"\nlock_file="{self.root}/agent.lock"\n')
        self.assertEqual(validate_disposable_config(self.cfg,self.root)["database"],
                         str(self.root/"queue.sqlite3"))
    def test_missing_database_does_not_fall_back_to_live_default(self):
        self.write(f'[gate]\nlock_file="{self.root}/agent.lock"\n')
        with self.assertRaises(ValueError):validate_disposable_config(self.cfg,self.root)
    def test_missing_gate_section_rejected(self):
        self.write('[worker]\ndrain_enabled=true\n')
        with self.assertRaises(ValueError):validate_disposable_config(self.cfg,self.root)
    def test_outside_path_rejected(self):
        self.write(f'[gate]\ndatabase="/home/operator/live/queue.sqlite3"\nlock_file="{self.root}/agent.lock"\n')
        with self.assertRaises(ValueError):validate_disposable_config(self.cfg,self.root)
    def test_symlink_parent_escape_rejected(self):
        (self.root/"link").symlink_to("/tmp")
        self.write(f'[gate]\ndatabase="{self.root}/link/queue.sqlite3"\nlock_file="{self.root}/agent.lock"\n')
        with self.assertRaises(ValueError):validate_disposable_config(self.cfg,self.root)
    def test_enabled_non_disposable_graph_rejected(self):
        self.write(f'[gate]\ndatabase="{self.root}/queue.sqlite3"\nlock_file="{self.root}/agent.lock"\n[worker]\ngraphiti_enabled=true\ngraphiti_group="graphiti_live"\n')
        with self.assertRaises(ValueError):validate_disposable_config(self.cfg,self.root)
if __name__=="__main__":unittest.main()
