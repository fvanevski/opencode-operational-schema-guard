"""D1.3: protect the backend from accidental fence crash coupling.

These tests are a deterministic unit-file contract; host systemd failure
interleavings remain mandatory separate validation.
"""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parent
class UnitDependency(unittest.TestCase):
    def test_backend_requires_fence_at_start_without_lifetime_binding(self):
        unit=(ROOT/"units/opencode-serve.service.d.ghdev108.conf").read_text()
        self.assertIn("Requires=ghdev-ingress-fence.service",unit)
        self.assertIn("After=ghdev-ingress-fence.service",unit)
        self.assertNotIn("BindsTo=",unit.splitlines()[-5:])
        self.assertFalse(any(line.startswith(("BindsTo=","PartOf=")) for line in unit.splitlines()))
        self.assertIn("idle_window.py check-start",unit)
        self.assertIn("--port 49375",unit)
    def test_fence_supervised_restarts_independently(self):
        unit=(ROOT/"units/ghdev-ingress-fence.service").read_text()
        self.assertIn("Restart=on-failure",unit)
        self.assertIn("GHDEV_WINDOW_JOURNAL=",unit)
        self.assertIn("GHDEV_BACKEND_PORT=49375",unit)

if __name__=="__main__": unittest.main()
